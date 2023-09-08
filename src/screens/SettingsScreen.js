import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useShooterApiContext } from '../contexts/ShooterAPIContext';


const SettingsScreen = () => {
  const { serverUrl, setServerUrl } = useShooterApiContext();
  const [localServerUrl, setLocalServerUrl] = useState(serverUrl);

  const handleSave = () => {
    setServerUrl(localServerUrl);
    alert('url saved!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Server URL:</Text>
      <TextInput
        style={styles.input}
        value={localServerUrl}
        onChangeText={setLocalServerUrl}
        placeholder="Enter server URL"
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
  },
});

export default SettingsScreen;
