// WifiBindingProvider.kiss.js
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  AppState,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import WifiManager from "react-native-wifi-reborn";

const C = { CONNECT_TIMEOUT_MS: 7000, SETTLE_MS: 800, COOLDOWN_MS: 6000 };
const WifiCtx = createContext(null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function WifiBindingProvider({
  children,
  targetSsid = "D1Mini_AP",
  targetPass = "12345678",
  autoBindOnForeground = false,
  showBanner = true,
  bannerSafeArea = true,
}) {
  const [onTarget, setOnTarget] = useState(false);
  const [bound, setBound] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | connecting | binding | bound | error

  const lastBindTsRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const inFlightRef = useRef(Promise.resolve());
  const pendingEnableWifiRef = useRef(false); // <— försök igen när vi blir aktiva

  // ---- Helpers ----
  const ensureAndroidWifiPermissions = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return res === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const isWifiEnabled = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const enabled = await WifiManager.isEnabled(); // Android only
      return !!enabled;
    } catch {
      return true;
    }
  };

  // Öppna Wi-Fi-panel (Android 10+) eller Wi-Fi settings (äldre Android).
  // På iOS: visa info och försök öppna Settings-appen (kan ignoreras).
  const openWifiEnableUI = async () => {
    if (Platform.OS === "android") {
      try {
        // Försök Settings Panel (Android 10+)
        await Linking.sendIntent?.("android.settings.panel.action.WIFI");
        return;
      } catch {}
      try {
        // Fallback: full Wi-Fi settings
        await Linking.sendIntent?.("android.settings.WIFI_SETTINGS");
        return;
      } catch {}
      try {
        await Linking.openSettings();
      } catch {}
      return;
    } else {
      // iOS: går ej toggla programmässigt
      Alert.alert(
        "Slå på Wi-Fi",
        "Slå på Wi-Fi i Inställningar och kom tillbaka till appen.",
        [{ text: "OK" }]
      );
      try {
        // Vissa iOS-versioner ignorerar detta; det är bäst effort.
        await Linking.openURL("App-Prefs:root=WIFI");
      } catch {}
    }
  };

  const refreshOnTarget = async () => {
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
  };

  const waitForTarget = async (timeoutMs = C.CONNECT_TIMEOUT_MS) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await refreshOnTarget()) return true;
      await sleep(300);
    }
    return false;
  };

  // ---- Basflöden ----
  const connectOnce = async ({ password = targetPass } = {}) => {
    setError(null);

    // 0) Wi-Fi måste vara på (Android)
    if (!(await isWifiEnabled())) {
      setPhase("error");
      setError("Wi-Fi är avstängt. Slå på Wi-Fi och försök igen.");
      pendingEnableWifiRef.current = true; // försök igen när appen blir aktiv
      await openWifiEnableUI();
      return false;
    }

    setPhase("connecting");
    await ensureAndroidWifiPermissions();
    await WifiManager.connectToProtectedSSID(
      targetSsid,
      password,
      false,
      false
    );
    await sleep(C.SETTLE_MS);
    const ok = await waitForTarget();
    if (!ok) {
      setPhase("error");
      setError("Kunde inte ansluta till målnätet.");
      return false;
    }
    return true;
  };

  const bindOnce = async () => {
    setError(null);
    const ok = await refreshOnTarget();
    if (!ok) return false; // bind endast om redan på rätt SSID

    if (Platform.OS === "android") {
      setPhase("binding");
      await ensureAndroidWifiPermissions();
      await WifiManager.forceWifiUsageWithOptions(true, { noInternet: true });
    }
    setBound(true);
    setPhase("bound");
    lastBindTsRef.current = Date.now();
    return true;
  };

  const unbind = async () => {
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
  };

  // ---- EN knapp: anslut + bind, eller koppla från ----
  const connectAndBind = async () => {
    setError(null);
    if (bound) {
      await unbind();
      return true;
    }
    if (!(await refreshOnTarget())) {
      const ok = await connectOnce({});
      if (!ok) return false;
    }
    return await bindOnce();
  };

  // För API-anrop: binda endast om redan på SSID
  const ensureBoundIfOnTarget = async () => {
    return (inFlightRef.current = inFlightRef.current.then(async () => {
      if (!(await refreshOnTarget())) return false;
      if (bound && Date.now() - lastBindTsRef.current < C.COOLDOWN_MS)
        return true;
      return await bindOnce();
    }));
  };

  // Auto-bind vid återkomst till förgrund + hantera pendingEnableWifiRef
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      const prev = appStateRef.current;
      appStateRef.current = state;

      if (prev !== "active" && state === "active") {
        // Om användaren var ute och slog på Wi-Fi, försök klart flödet
        if (pendingEnableWifiRef.current) {
          pendingEnableWifiRef.current = false;
          await connectAndBind();
          return;
        }
        if (autoBindOnForeground) {
          await ensureBoundIfOnTarget();
        }
      }

      if (state !== "active" && bound) {
        await unbind();
      }
    });
    return () => sub?.remove?.();
  }, [autoBindOnForeground, bound]);

  // ---- UI: banner ----
  function Banner() {
    if (!showBanner) return null;
    const Wrap = bannerSafeArea ? SafeAreaView : View;
    const isWorking = phase === "connecting" || phase === "binding";
    const primaryLabel = bound
      ? "Koppla från"
      : onTarget
      ? isWorking
        ? "Jobbar…"
        : "Bind"
      : isWorking
      ? "Ansluter…"
      : "Anslut & bind";

    return (
      <Wrap style={styles.bannerWrap} pointerEvents="box-none">
        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Wi-Fi</Text>
            <Text style={styles.bannerText} numberOfLines={2}>
              {onTarget
                ? bound
                  ? "Bunden mot " + targetSsid
                  : "På nätet: " + targetSsid
                : "Ej ansluten till " + targetSsid}
              {phase === "connecting"
                ? " (ansluter…)"
                : phase === "binding"
                ? " (binder…)"
                : ""}
            </Text>
            {!!error && <Text style={styles.bannerErr}>{error}</Text>}
          </View>

          <View style={styles.btnCol}>
            <TouchableOpacity
              disabled={isWorking}
              style={[styles.btn, isWorking && styles.btnDisabled]}
              onPress={connectAndBind}
            >
              <Text style={styles.btnText}>{primaryLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Wrap>
    );
  }

  const value = {
    onTarget,
    bound,
    error,
    phase,
    refreshOnTarget,
    connectOnce,
    bindOnce,
    connectAndBind,
    ensureBoundIfOnTarget,
    unbind,
  };

  return (
    <WifiCtx.Provider value={value}>
      {showBanner && <Banner />}
      {children}
    </WifiCtx.Provider>
  );
}

export function useWifiBinding() {
  const ctx = useContext(WifiCtx);
  if (!ctx)
    throw new Error("useWifiBinding must be used within WifiBindingProvider");
  return ctx;
}

const styles = StyleSheet.create({
  bannerWrap: {
    backgroundColor: "#fff7e6",
    borderBottomWidth: 1,
    borderBottomColor: "#ffcf73",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  bannerTitle: { fontWeight: "700", color: "#5a4500" },
  bannerText: { color: "#7a5d00", maxWidth: 240 },
  bannerErr: { color: "#b00020", marginTop: 2 },
  btnCol: { gap: 6 },
  btn: {
    backgroundColor: "#ffd24d",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#5a4500", fontWeight: "600" },
});
