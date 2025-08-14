import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useShooterApiContext } from "../contexts/ShooterAPIContext";
import {
  writeRoutinesDb,
  deleteRoutinesDb,
  readRoutinesDb,
  ROUTINES_DB_PATH,
} from "../storage/routinesDb";
import { useWifiBinding } from "../contexts/WifiBindingProvider";

export default function SettingsScreen() {
  const { programApi } = useShooterApiContext();
  const [loading, setLoading] = useState(false);

  const { serverUrl, setServerUrl } = useShooterApiContext();
  const [localServerUrl, setLocalServerUrl] = useState(serverUrl);

  const handleSaveServerUrl = () => {
    setServerUrl(localServerUrl);
    alert("url saved!");
  };

  const handleDownloadRoutines = async () => {
    setLoading(true);
    try {

        // 1) Hämta lista
        const listRes = await programApi.get(); // förväntar { data: [{id, name, ...}] }
        const list = Array.isArray(listRes?.data) ? listRes.data : [];

        if (list.length === 0) {
          await deleteRoutinesDb();
          return await writeRoutinesDb([]); // tom db
        }

        // 2) Hämta detaljer för varje rutin
        const details = await Promise.all(
          list.map(async (item) => {
            try {
              const det = await programApi.getById(item.id);
              return det?.data || null;
            } catch {
              return null;
            }
          })
        );

        const items = details.filter(Boolean);

        // 3) Skriv EN fil (överskriv alltid)
        await deleteRoutinesDb();
        var result = await writeRoutinesDb(items);


      Alert.alert(
        "Klart",
        `Sparade ${result.count} rutin(er) i 1 fil.\n\n${ROUTINES_DB_PATH}`
      );
    } catch (e) {
      console.warn("Download routines error", e);
      Alert.alert(
        "Fel",
        "Kunde inte ladda ner rutiner. Kontrollera att du är ansluten till D1."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDb = async () => {
    await deleteRoutinesDb();
    Alert.alert("Raderat", "Lokal rutinfil borttagen.");
  };

  const handleShowLocalStatus = async () => {
    const db = await readRoutinesDb();
    if (!db) {
      Alert.alert("Status", "Ingen lokal rutinfil hittad.");
    } else {
      Alert.alert(
        "Status",
        `version: ${db.version}\ncount: ${db.count}\nsavedAt: ${db.savedAt}`
      );
    }
  };

  // 1) Ta bort funktionsparametrarna
  //    och använd programApi + ensureBoundFor från hookarna i scope.
  const handleProvisionAll = async () => {
    try {
      console.log("provision all");
      const db = await readRoutinesDb();
      if (!db || !db.items?.length) {
        Alert.alert("Inget att provisionera", "Lokal DB är tom.");
        return;
      }

      for (const r of db.items) {
        // TODO: anropa ditt API, t.ex.:
        // await programApi.save(r);
        try{
          await programApi.createOrUpdate(r);
        }catch(e){
          console.error('failed to provision', e);
        }
        
        console.log("provision routine", r); // <-- ska nu logga
      }
  

      Alert.alert("Klart", `Provisionerade ${db.items.length} rutin(er).`);
    } catch (e) {
      console.warn("Provision error", e);
      Alert.alert("Fel", "Provisionering misslyckades.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rutin-hantering (lokal “DB” i 1 fil)</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#28a745" }]}
        onPress={handleDownloadRoutines}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Ladda ner & spara alla</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#6c757d" }]}
        onPress={handleShowLocalStatus}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Visa lokal status</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#28a745" }]}
        onPress={handleProvisionAll}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Provision Controller</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#dc3545" }]}
        onPress={handleDeleteDb}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Radera lokal DB</Text>
      </TouchableOpacity>

      <Text style={styles.path}>Fil: {ROUTINES_DB_PATH}</Text>

      <Text style={styles.title}>Server URL:</Text>
      <TextInput
        style={styles.input}
        value={localServerUrl}
        onChangeText={setLocalServerUrl}
        placeholder="Enter server URL"
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#28a745" }]}
        onPress={handleSaveServerUrl}
      >
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  path: { marginTop: 8, color: "#666" },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
});
