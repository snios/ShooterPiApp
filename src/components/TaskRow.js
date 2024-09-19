import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

export const TaskRow = ({ task, id, handleUpdateTask, handleDeleteTask }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newOperation, setNewOperation] = useState(task.action);
  const [newDuration, setNewDuration] = useState(task.delay);

  const handleSaveAction = () => {
    let duration = parseFloat(newDuration);
    if (isNaN(duration)) {
      duration = 0;
    }
    handleUpdateTask(id, { action: newOperation });
    setIsEditing(false);
  };
  const handleSaveDelay = () => {
    let duration = parseFloat(newDuration);
    if (isNaN(duration)) {
      duration = 0;
    }
    handleUpdateTask(id, { delay: duration });
    setIsEditing(false);
  };

  const handleSwitchToAction = () => {
    handleUpdateTask(id, { action: 0 });
    setIsEditing(false);
  };
  const handleSwitchToDelay = () => {
    handleUpdateTask(id, { delay: 5000 });
    setIsEditing(false);
  };

  const handleDelete = () => {
    handleDeleteTask(id);
  };

  const handleToggle = (operation) => {
    setNewOperation(operation === 0 ? 1 : 0);
  };

  const handleNumberInputChange = (text) => {
    // Replace all commas with periods
    const sanitizedText = text.replace(",", ".");
    setNewDuration(sanitizedText);
  };
  return (
    <View style={styles.taskItem}>
      {isEditing ? (
        <>
          {task.delay ? (
            <>
              <TextInput
                value={String(newDuration)}
                onChangeText={(text) => handleNumberInputChange(text)}
                style={styles.editableText}
                keyboardType="numeric"
              />
              <Button
                title="Switch"
                onPress={() => {
                  handleSwitchToAction();
                }}
              />
              <Button title="Done" onPress={handleSaveDelay} />
            </>
          ) : (
            <>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={newOperation === "on" ? "#f5dd4b" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => handleToggle(newOperation)}
                value={newOperation === 0}
              />
              <Button
                title="Switch"
                onPress={() => {
                  handleSwitchToDelay();
                }}
              />
              <Button title="Done" onPress={handleSaveAction} />
            </>
          )}
        </>
      ) : (
        <>
          <View style={{ flex: 30 }}>
            <Text>
              {task.delay ? `Delay: ${task.delay}ms` : `Action: ${task.action}`}
            </Text>
          </View>
          <View
            style={{
              flex: 15,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
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
  editableText: {
    borderColor: "blue",
    borderWidth: 1,
    backgroundColor: "white",
    width: 60,
  },
  operation: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    padding: 6,
  },
  duration: {
    fontSize: 14,
    color: "#666",
  },
  playButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "green",
    borderRadius: 50,
    padding: 12,
  },
  playButtonRunning: {
    backgroundColor: "#FFA50080",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  overlayText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
});
