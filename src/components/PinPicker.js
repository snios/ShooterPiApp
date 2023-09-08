import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useShooterApiContext } from "../contexts/ShooterAPIContext";

const PinPicker = ({ onSelectPin, selectedPinId }) => {
  const { pinsApi } = useShooterApiContext();
  const [pins, setPins] = useState([]);

  useEffect(() => {
    // Fetch the available pins from the API
    pinsApi.get()
      .then((response) => {
        console.log('got pins', response.data)
        setPins(response.data);
      })
      .catch(e => console.log('Error fetching pins', e));
  }, []);

  // Render each pin button in the grid
  const renderPinButton = ({ item: pin }) => {
    return (
      <TouchableOpacity
        key={pin.id}
        style={[
          styles.pinButton,
          { backgroundColor: selectedPinId === pin.id ? "yellow" : "green" }
        ]}
        onPress={() => onSelectPin(pin)}
      >
        <Text>{pin.friendly_name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.pinPickerContainer}>
      <FlatList
        data={pins}
        renderItem={renderPinButton}
        numColumns={4} // Set the number of columns you want in the grid
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pinPickerContainer: {
    marginBottom: 20,
  },
  pinButton: {
    flex: 1,
    height: 50,
    margin: 5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
});

export default PinPicker;
