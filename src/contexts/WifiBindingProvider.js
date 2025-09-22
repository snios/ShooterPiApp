// WifiBindingProvider.kiss.js
// Enkel: EN huvudknapp som gör rätt sak (anslut + bind) eller kopplar från.

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
} from "react-native";
import WifiManager from "react-native-wifi-reborn";

const C = {
  CONNECT_TIMEOUT_MS: 7000,
  SETTLE_MS: 800,
  COOLDOWN_MS: 6000,
};

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
  const inFlightRef = useRef(Promise.resolve()); // serialisera anrop

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
    if (!ok) return false; // bind endast om vi redan är på rätt SSID

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
    // Är vi redan bunden? Gör knappen som toggle → unbind.
    if (bound) {
      await unbind();
      return true;
    }
    // Inte bunden → säkerställ att vi är på SSID, annars anslut.
    if (!(await refreshOnTarget())) {
      const ok = await connectOnce({});
      if (!ok) return false;
    }
    // När vi väl är på SSID → bind en gång.
    return await bindOnce();
  };

  // Ett enkelt ensure för API-anrop (binder bara om vi redan är på SSID)
  const ensureBoundIfOnTarget = async () => {
    return (inFlightRef.current = inFlightRef.current.then(async () => {
      if (!(await refreshOnTarget())) return false;
      if (bound && Date.now() - lastBindTsRef.current < C.COOLDOWN_MS)
        return true;
      return await bindOnce();
    }));
  };

  // Valfri: auto-bind när appen blir aktiv, men endast om vi redan är på rätt SSID
  useEffect(() => {
    if (!autoBindOnForeground) return;
    const sub = AppState.addEventListener("change", async (state) => {
      const prev = appStateRef.current;
      appStateRef.current = state;
      if (prev !== "active" && state === "active") {
        await ensureBoundIfOnTarget();
      }
      if (state !== "active" && bound) {
        await unbind();
      }
    });
    return () => sub?.remove?.();
  }, [autoBindOnForeground, bound]);

  // ---- UI: enkel inline-banner som trycker ned innehållet ----
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
    // state
    onTarget,
    bound,
    error,
    phase,
    // actions
    refreshOnTarget,
    connectOnce, // kvar om du vill använda manuellt
    bindOnce, // kvar om du vill använda manuellt
    connectAndBind, // <-- EN knapp: anslut + bind (eller unbind om redan bunden)
    ensureBoundIfOnTarget, // för API-anrop
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

// ---- Styles ----
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
