import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Platform,
  PermissionsAndroid,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import WifiManager from "react-native-wifi-reborn";

const WifiBindingContext = createContext(null);

// ---- Konstanter för stabil anslutning / retrys ----
const CONNECT_TIMEOUT_MS = 8000; // max att vänta på rätt SSID
const SETTLE_MS = 1200; // liten paus efter connect
const AUTO_RETRIES = 3; // antal auto-försök
const RETRY_DELAY_MS = 1500; // bas-delay mellan försök (backoff)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function WifiBindingProvider({
  children,
  targetSsid = "D1Mini_AP",
  targetPass = "12345678", // kan vara tomt om du inte vill auto-ansluta
  autoBind = true,
  autoConnect = true, // försök auto-ansluta före bind
  showBanner = true,
  showModal = true,
  modalDelayMs = 5000, // visa modal efter så här lång tid vid FEL (inte under försök)
}) {
  const [bound, setBound] = useState(false);
  const [onTarget, setOnTarget] = useState(false);
  const [error, setError] = useState(null);

  // UI state
  const [phase, setPhase] = useState("idle"); // idle | checking | connecting | binding | bound | error
  const [modalVisible, setModalVisible] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Refs för idempotens/cooldown/samordning
  const boundRef = useRef(false);
  useEffect(() => {
    boundRef.current = bound;
  }, [bound]);

  const onTargetRef = useRef(false);
  useEffect(() => {
    onTargetRef.current = onTarget;
  }, [onTarget]);

  const bindingPromiseRef = useRef(null);
  const lastBindTsRef = useRef(0);
  const attemptIdRef = useRef(0);

  // ===== Helpers =====
  async function ensureAndroidWifiPermissions() {
    if (Platform.OS !== "android") return true;
    try {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return res === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  async function isOnTargetSsid() {
    try {
      if (Platform.OS === "android") {
        const ok = await ensureAndroidWifiPermissions();
        if (!ok) throw new Error("location-permission-denied");
      }
      const ssid = await WifiManager.getCurrentWifiSSID();
      const ok = !!ssid && ssid.replace(/"/g, "") === targetSsid;
      setOnTarget(ok);
      return ok;
    } catch {
      setOnTarget(false);
      return false;
    }
  }

  // Vänta/polla tills vi faktiskt är på rätt SSID (eller timeout)
  async function waitForTargetSsid(timeoutMs = CONNECT_TIMEOUT_MS) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await isOnTargetSsid()) return true;
      await sleep(400);
    }
    return false;
  }

  async function tryAutoConnectOnce({ password, isHidden = false } = {}) {
    await WifiManager.connectToProtectedSSID(
      targetSsid,
      password,
      false,
      isHidden
    );
    await sleep(SETTLE_MS); // låt DHCP/route hinna
    return await waitForTargetSsid(CONNECT_TIMEOUT_MS);
  }

  async function tryAutoConnectWithRetries({ password }) {
    if (await isOnTargetSsid()) return true; // redan rätt
    for (let i = 0; i < AUTO_RETRIES; i++) {
      const ok = await tryAutoConnectOnce({ password });
      if (ok) return true;
      await sleep(RETRY_DELAY_MS * Math.pow(1.5, i)); // backoff
    }
    return false;
  }

  // Scanning används bara om du vill lista kandidater (behövs ej för enkel SSID)
  async function scanTargets() {
    if (Platform.OS !== "android") return [];
    await ensureAndroidWifiPermissions();
    let list = [];
    try {
      list = await WifiManager.reScanAndLoadWifiList();
    } catch {
      try {
        list = await WifiManager.loadWifiList();
      } catch {
        list = [];
      }
    }
    return list
      .map((x) => ({
        ssid: (x?.SSID || "").replace(/"/g, ""),
        bssid: x?.BSSID || null,
        level: x?.level ?? 0,
      }))
      .filter((x) => x.ssid === targetSsid)
      .sort((a, b) => (b.level || 0) - (a.level || 0));
  }

  // ---- Tyst/Idempotent bindning för interceptors ----
  async function bindIfNeeded({ quiet = true, cooldownMs = 8000 } = {}) {
    // Nyss bundna + på rätt SSID → hoppa över
    if (
      boundRef.current &&
      onTargetRef.current &&
      Date.now() - lastBindTsRef.current < cooldownMs
    ) {
      return;
    }
    if (bindingPromiseRef.current) return bindingPromiseRef.current; // vänta på pågående bind

    const p = (async () => {
      await bind({ quiet });
    })();
    bindingPromiseRef.current = p;
    try {
      await p;
    } finally {
      bindingPromiseRef.current = null;
    }
  }

  // ---- Huvud-bind: idempotent, med retrys och lugn UI ----
  async function bind({ quiet = false } = {}) {
    setError(null);

    // redan klart → gör inget
    if (boundRef.current && onTargetRef.current) {
      if (!quiet) setPhase("bound");
      return;
    }

    const myAttempt = ++attemptIdRef.current;
    if (!quiet) setPhase("checking");

    // 1) Säkerställ rätt SSID (med autoConnect + retrys)
    let haveTarget = await isOnTargetSsid();
    if (!haveTarget && autoConnect) {
      if (!quiet) setPhase("connecting");
      haveTarget = await tryAutoConnectWithRetries({ password: targetPass });
    }

    // Om en ny bind() hann starta under tiden → avbryt denna
    if (attemptIdRef.current !== myAttempt) return;

    if (!haveTarget) {
      const msg = "Kunde inte hitta/ansluta till D1Mini_AP.";
      setError(msg);
      setBound(false);
      if (!quiet) setPhase("error");
      return;
    }

    // 2) Bind processens trafik (Android)
    if (Platform.OS === "android") {
      if (!quiet) setPhase("binding");
      await ensureAndroidWifiPermissions();
      await WifiManager.forceWifiUsageWithOptions(true, { noInternet: true });
    }

    setBound(true);
    setPhase("bound");
    lastBindTsRef.current = Date.now();
  }

  async function unbind() {
    setError(null);
    if (Platform.OS === "android") {
      try {
        await WifiManager.forceWifiUsageWithOptions(false, {
          noInternet: true,
        });
      } catch {}
    }
    setBound(false);
    setPhase("idle");
  }

  // Manuell connect (t.ex. från modalens knapp)
  async function connectToDevice(ssid, pass, isHidden = false) {
    await ensureAndroidWifiPermissions();
    setPhase("connecting");
    await WifiManager.connectToProtectedSSID(
      ssid || targetSsid,
      pass || targetPass,
      false,
      isHidden
    );
    await sleep(SETTLE_MS);
    const ok = await waitForTargetSsid(CONNECT_TIMEOUT_MS);
    if (!ok) {
      setPhase("error");
      setError("Kunde inte ansluta till vald enhet.");
      return false;
    }
    return true;
  }

  // ===== UI handling =====
  // Visa modal ENDAST vid faktisk error (inte under försök), efter delay
  useEffect(() => {
    if (!showModal) return;
    if (phase !== "error") {
      setModalVisible(false);
      return;
    }
    const t = setTimeout(() => setModalVisible(true), modalDelayMs);
    return () => clearTimeout(t);
  }, [phase, showModal, modalDelayMs]);

  // Auto-bind i förgrunden, unbind i bakgrunden
  useEffect(() => {
    let mounted = true;

    const doBind = async () => {
      if (!autoBind) return;
      try {
        await bind();
      } catch (e) {
        setError(e?.message || "Bind-fel");
        setPhase("error");
      }
    };

    doBind();

    const sub = AppState.addEventListener("change", async (state) => {
      if (!mounted) return;
      const prev = appStateRef.current;
      appStateRef.current = state;

      if (prev !== "active" && state === "active" && autoBind) {
        try {
          await bind();
        } catch (e) {
          setError(e?.message || "Bind-fel");
          setPhase("error");
        }
      }
      if (state !== "active" && boundRef.current) {
        try {
          await unbind();
        } catch {}
      }
    });

    return () => {
      mounted = false;
      sub?.remove?.();
      unbind().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSsid, targetPass, autoBind, autoConnect]);

  // ===== UI components (banner + modal) =====
  // Visa banner bara när det faktiskt är relevant (inte korta “checking” blippar)
  const showBusy =
    !onTarget ||
    phase === "connecting" ||
    phase === "binding" ||
    phase === "error";

  const bannerText = !onTarget
    ? "Inte ansluten till D1Mini_AP"
    : phase === "connecting"
    ? "Ansluter till D1Mini_AP…"
    : phase === "binding"
    ? "Binder trafik till D1…"
    : phase === "error"
    ? error || "Nätverksfel"
    : "Ansluten";

  function Banner() {
    if (!showBanner || !showBusy) return null;
    return (
      <SafeAreaView style={styles.bannerWrap} pointerEvents="box-none">
        <View style={styles.banner}>
          <ActivityIndicator size="small" />
          <Text style={styles.bannerText} numberOfLines={1}>
            {bannerText}
          </Text>
          <TouchableOpacity style={styles.bannerBtn} onPress={() => bind()}>
            <Text style={styles.bannerBtnText}>Försök igen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function TroubleshootModal() {
    if (!showModal) return null;
    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Kan inte ansluta</Text>
            <Text style={styles.modalBody}>
              {error || "Appen kunde inte ansluta/binda till D1Mini_AP."}
            </Text>

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#007bff" }]}
                onPress={() => {
                  setModalVisible(false);
                  bind();
                }}
              >
                <Text style={styles.modalBtnText}>Försök igen</Text>
              </TouchableOpacity>
              {!!targetPass && (
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#28a745" }]}
                  onPress={async () => {
                    setModalVisible(false);
                    await connectToDevice(targetSsid, targetPass, false);
                    await bind();
                  }}
                >
                  <Text style={styles.modalBtnText}>Anslut automatiskt</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.modalBtn,
                { backgroundColor: "#6c757d", marginTop: 8 },
              ]}
              onPress={() => {
                setModalVisible(false);
                Linking.openSettings().catch(() => {});
              }}
            >
              <Text style={styles.modalBtnText}>Öppna inställningar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 8 }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "#666" }}>Stäng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const value = {
    bound,
    onTarget,
    error,
    phase,
    bind,
    bindIfNeeded, // <— använd denna i axios-interceptor
    unbind,
    connectToDevice,
    scanTargets, // om du vill lista kandidater på Android
  };

  return (
    <WifiBindingContext.Provider value={value}>
      {/* Global UI */}
      <Banner />
      <TroubleshootModal />
      {/* Din app */}
      <View style={{ flex: 1 }}>{children}</View>
    </WifiBindingContext.Provider>
  );
}

export function useWifiBinding() {
  const ctx = useContext(WifiBindingContext);
  if (!ctx)
    throw new Error("useWifiBinding must be used within WifiBindingProvider");
  return ctx;
}

// ===== Styles =====
const styles = StyleSheet.create({
  bannerWrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 9999 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff7e6",
    borderBottomColor: "#ffcf73",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bannerText: { flex: 1, color: "#7a5d00" },
  bannerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ffd24d",
    borderRadius: 6,
  },
  bannerBtnText: { color: "#5a4500", fontWeight: "600" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "86%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalBody: { color: "#444", marginBottom: 12 },
  modalRow: { flexDirection: "row", gap: 8 },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalBtnText: { color: "#fff", fontWeight: "700" },
});
