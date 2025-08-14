import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform, PermissionsAndroid } from "react-native";
import WifiManager from "react-native-wifi-reborn";

const WifiBindingContext = createContext(null);

export function WifiBindingProvider({
  children,
  targetSsid = "D1Mini_AP",
  autoBind = true,
}) {
  const [bound, setBound] = useState(false);
  const [error, setError] = useState(null);
  const appStateRef = useRef(AppState.currentState);

  console.log('WIFI MANAGER');

  async function ensureAndroidWifiPermissions() {
    if (Platform.OS !== "android") return;
    try {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
    } catch {}
  }

  async function isOnTargetSsid() {
    try {
      if (Platform.OS === "android") {
        await ensureAndroidWifiPermissions();
      }
      
      const ssid = await WifiManager.getCurrentWifiSSID();
   
      if (!ssid) return false;
      return ssid.replace(/"/g, "") === targetSsid;
    } catch(e) {
      console.log("is on target ssid", e);
      return false;
    }
  }

  async function bind() {
    setError(null);
    console.log('BINDING!', targetSsid);
    // Om vi kräver ett visst SSID – se till att vi redan är anslutna
    if (targetSsid) {
      const ok = await isOnTargetSsid();
      if (!ok) {
        setError(
          `Inte ansluten till ${targetSsid}. Anslut först (manuellt eller via connectToDevice).`
        );
        setBound(false);
        return;
      }
    }

    if (Platform.OS === "android") {
      console.log('Forcing Wifi usage!');
      await ensureAndroidWifiPermissions();
      await WifiManager.forceWifiUsageWithOptions(true, { noInternet: true });
    }

    // På iOS är forceWifi ett no-op, men vi markerar bound=true när SSID stämmer
    setBound(true);
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
  }

  // Kan användas senare om ni vill ansluta via kod
  async function connectToDevice(ssid, pass, isHidden = false) {
    await ensureAndroidWifiPermissions();
    await WifiManager.connectToProtectedSSID(ssid, pass, false, isHidden);
  }

  async function ensureBoundFor(fn) {
    await bind();
    try {
      return await fn();
    } finally {
      await unbind();
    }
  }

  // Auto-bind vid start och när appen kommer till förgrunden. Släpp när appen lämnar förgrunden/unmount.
  useEffect(() => {
    let mounted = true;

    const doBind = async () => {
      if (!autoBind) return;
      try {
        await bind();
      } catch (e) {
        setError(e?.message || "Bind-fel");
      }
    };

    doBind();

    const sub = AppState.addEventListener("change", async (state) => {
      if (!mounted) return;
      const prev = appStateRef.current;
      appStateRef.current = state;

      if (prev !== "active" && state === "active" && autoBind) {
        try {
          console.log('bind');
          await bind();
        } catch (e) {
          setError(e?.message || "Bind-fel");
        }
      }
      if (state !== "active" && bound) {
        try {
          console.log('unbind');
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
  }, [targetSsid, autoBind]);

  const value = { bound, error, bind, unbind, connectToDevice, ensureBoundFor };
  return (
    <WifiBindingContext.Provider value={value}>
      {children}
    </WifiBindingContext.Provider>
  );
}

export function useWifiBinding() {
  const ctx = useContext(WifiBindingContext);
  if (!ctx)
    throw new Error("useWifiBinding must be used within WifiBindingProvider");
  return ctx;
}
