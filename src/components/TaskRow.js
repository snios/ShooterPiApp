import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Switch } from "react-native";

export const TaskRow = ({ task, id, handleUpdateTask, handleDeleteTask }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newOperation, setNewOperation] = useState(task.operation);
  const [newDuration, setNewDuration] = useState(task.duration);

  const handleSave = () => {
    let duration = parseFloat(newDuration);
    if (isNaN(duration)) {
      duration = 0;
    }
    handleUpdateTask(id, { operation: newOperation, duration: duration });
    setIsEditing(false);
  };

  const handleDelete = () => {
    handleDeleteTask(id);
  };

  const handleToggle = (operation) => {
    setNewOperation(operation === 'on' ? 'off' : 'on');
  };

  const handleNumberInputChange = (text) => {
    // Replace all commas with periods
    const sanitizedText = text.replace(',', '.');
    setNewDuration(sanitizedText);
  };
  return (
    <View style={styles.taskItem}>
      {isEditing ? (
        <>
          {/* <TextInput
            value={newOperation}
            onChangeText={setNewOperation}
            style={styles.editableText}
          /> */}
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={newOperation === 'on' ? '#f5dd4b' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={() => handleToggle(newOperation)}
              value={newOperation === 'on'}
            />
          <TextInput
            value={String(newDuration)}
            onChangeText={(text) => handleNumberInputChange(text)}
            style={styles.editableText}
            keyboardType="numeric"
          />
          <Button title="Done" onPress={handleSave} />
        </>
      ) : (
        <>
          <Text style={styles.operation}>{task.operation}</Text>
          <Text style={styles.duration}>{task.duration}s</Text>
          <Button title="Edit" onPress={() => setIsEditing(true)} />
          <Button title="Delete" onPress={handleDelete} />
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
    backgroundColor: 'white',
    width: 60,

  },
  operation: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    padding: 6
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
