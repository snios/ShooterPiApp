import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons'; // Make sure to install the vector-icons package
import { useShooterApiContext } from '../contexts/ShooterAPIContext';

const RoutineListScreen = ({ navigation }) => {
  const [routines, setRoutines] = useState([]);
  const { routinesApi, pinsApi } = useShooterApiContext();

  useEffect(() => {
    if(routinesApi)
      fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      const response = await routinesApi.get();
      console.log('got all routines', response);
      setRoutines(response.data);
    } catch (error) {
      alert(JSON.stringify(error));
      console.error('Error fetching routines:', error);
    }
  };

  const handleDeleteRoutine = async (id) => {
    try {
      await routinesApi.remove(id);
      fetchRoutines();
    } catch (error) {
      console.error('Error deleting routine:', error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.routineItem}
      onPress={() => navigation.navigate('ViewRoutine', { id: item.id })} // Navigate to ViewRoutineScreen
      onLongPress={() => handleDeleteRoutine(item.id)}
    >
      <View style={styles.routineNameContainer}>
        <Text style={styles.routineName}>{item.name}</Text>
      </View>
      {/* <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditRoutine', { id: item.id })}>
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton}>
          <AntDesign name="playcircleo" size={24} color="white" />
        </TouchableOpacity>
      </View> */}
    </TouchableOpacity>
  );

  const renderEmptyItem = () => (
    <TouchableOpacity style={styles.routineItem}
      onPress={() => navigation.navigate('CreateRoutine')} // Navigate to NewRoutineWizard
    >
      <View style={styles.routineNameContainer}>
        <Text style={styles.routineName}>New routine...</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={routines}
        renderItem={renderItem}
        ListFooterComponent={renderEmptyItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  list: {
    padding: 16,
  },
  routineItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineNameContainer: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    aspectRatio: 1, // Make the button square
    justifyContent: 'center', // Center the text vertically
    alignItems: 'center', // Center the text horizontally
  },
  playButton: {
    backgroundColor: 'green',
    borderRadius: 8,
    padding: 8,
    aspectRatio: 1, // Make the button square
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center', // Center the icon horizontally
  },
  buttonText: {
    color: 'black',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RoutineListScreen;