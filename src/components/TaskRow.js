import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

// ---- Helpers ----
const formatMsToSecText = (ms) => {
  if (typeof ms !== "number") return "";
  return (Math.round((ms / 1000) * 100) / 100).toFixed(2); // 2 dec
};

const parseSecondsTextToMs = (text) => {
  if (text == null) return 0;
  const raw = String(text).trim();
  if (!raw || raw === "." || raw === ",") return 0;

  const normalized = raw.replace(",", ".");
  const match = normalized.match(/(\d+)(?:\.(\d*))?/);
  if (!match) return null;

  const intPart = match[1];
  const decPart = (match[2] ?? "").slice(0, 6); // tillåt inmatning, vi rundar sen
  const numStr = decPart.length ? `${intPart}.${decPart}` : intPart;

  const num = parseFloat(numStr);
  if (Number.isNaN(num) || num < 0) return null;

  return Math.round(num * 1000);
};

// Rensa bort undefined-nycklar så de inte råkar skrivas in i state
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export const TaskRow = ({ task, id, handleUpdateTask, handleDeleteTask }) => {
  const [isEditing, setIsEditing] = useState(false);

  const isDelay = typeof task?.delay === "number"; // 0 ms är giltigt
  const [secondsText, setSecondsText] = useState(
    isDelay ? formatMsToSecText(task.delay) : ""
  );

  const [newOperation, setNewOperation] = useState(
    typeof task?.action === "number" ? task.action : 0
  );

  // Synca om parent ändrar delay externt
  useEffect(() => {
    if (typeof task?.delay === "number") {
      setSecondsText(formatMsToSecText(task.delay));
    }
  }, [task?.delay]);

  // ---- Delay ----
  const handleSaveDelay = () => {
    const ms = parseSecondsTextToMs(secondsText);
    if (ms == null) {
      // ogiltigt → återställ till senast giltiga
      const fallback = typeof task?.delay === "number" ? task.delay : 0;
      setSecondsText(formatMsToSecText(fallback));
      return;
    }
    handleUpdateTask(id, compact({ delay: ms, action: undefined }));
    setSecondsText(formatMsToSecText(ms));
    setIsEditing(false);
  };

  const handleSwitchToDelay = () => {
    const defMs = 5000;
    setIsEditing(true);
    setSecondsText(formatMsToSecText(defMs));
    // Uppdatera typ direkt så raden renderas som delay
    handleUpdateTask(id, compact({ delay: defMs, action: undefined }));
  };

  // ---- Action ----
  const handleToggleAction = () =>
    setNewOperation((prev) => (prev === 0 ? 1 : 0));

  const handleSaveAction = () => {
    handleUpdateTask(id, compact({ action: newOperation, delay: undefined }));
    setIsEditing(false);
  };

  const handleSwitchToAction = () => {
    setIsEditing(true);
    setNewOperation(typeof task?.action === "number" ? task.action : 0);
    handleUpdateTask(id, compact({ action: 0, delay: undefined }));
  };

  const handleDelete = () => handleDeleteTask(id);

  return (
    <View style={styles.taskItem}>
      {isEditing ? (
        <>
          {isDelay ? (
            <>
              <View style={styles.row}>
                <TextInput
                  value={secondsText}
                  onChangeText={setSecondsText} // inga sanitizers här
                  // ❌ ingen onEndEditing → spar inte på blur
                  onSubmitEditing={handleSaveDelay} // Enter/Done på tangentbordet
                  placeholder="0.00"
                  style={styles.editableText}
                  keyboardType={Platform.select({
                    ios: "decimal-pad",
                    android: "numeric",
                    default: "numeric",
                  })}
                  inputMode="decimal"
                  returnKeyType="done"
                  maxLength={12}
                />
                <Text style={styles.unit}>sek</Text>
              </View>
              <View style={styles.buttons}>
                <Button title="Switch" onPress={handleSwitchToAction} />
                <Button title="Done" onPress={handleSaveDelay} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Action</Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={handleToggleAction}
                  value={newOperation === 1}
                />
              </View>
              <View style={styles.buttons}>
                <Button title="Switch" onPress={handleSwitchToDelay} />
                <Button title="Done" onPress={handleSaveAction} />
              </View>
            </>
          )}
        </>
      ) : (
        <>
          <View style={{ flex: 30 }}>
            {isDelay ? (
              <Text>{`Delay: ${formatMsToSecText(task.delay)} sek`}</Text>
            ) : (
              <Text>{`Action: ${String(task.action)}`}</Text>
            )}
          </View>
          <View style={styles.rightBtns}>
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={{ marginRight: 10 }}
            >
              <FontAwesome name="edit" size={36} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <FontAwesome name="trash" size={36} color="black" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center" },
  editableText: {
    borderColor: "blue",
    borderWidth: 1,
    backgroundColor: "white",
    width: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 16,
  },
  unit: { marginLeft: 6, fontSize: 16, color: "#333" },
  buttons: { flexDirection: "row", gap: 8, marginTop: 6 },
  rightBtns: {
    flex: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: { marginRight: 8, color: "#666" },
});
