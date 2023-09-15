import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList } from 'react-native';
import { useShooterApiContext } from '../contexts/ShooterAPIContext';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { 
  routineState, 
  addChannel, 
  addTaskSelector, 
  removeChannel, 
  removeTask, 
  updateChannelSelector, 
  updateTaskSelector 
} from '../states/editRoutineState';

const EditRoutineScreen = ({ navigation, route }) => {
  const [routine, setRoutine] = useRecoilState(routineState);
  const routineId = route.params?.id;

  const { routinesApi } = useShooterApiContext();

 // Use helper functions to modify state
 const handleAddChannel = (newChannel) => addChannel(setRoutine, newChannel);
 const handleRemoveChannel = (channel_id) => removeChannel(setRoutine, channel_id);
 const handleAddTask = (channel_id) => addTaskSelector(setRoutine, channel_id, newTask);
 const handleRemoveTask = (task_id, task_index) => removeTask(setRoutine, task_id, task_index);

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        // console.log('GET ROUTINE', routineId)
        const reponse = await routinesApi.get(routineId);
        // console.log('GET ROUTINE', reponse.data)
        setRoutine(reponse.data);
      } catch (error) {
        console.error('Error fetching routine:', error);
      }
    };

    fetchRoutine();
  }, [routineId]);


  if (!routine) {
    return <Text>Loading...</Text>;
  }

  return (
    <View>
      <Text>Name:</Text>
      <TextInput
        value={routine.name}
        onChangeText={(text) => setRoutine({ ...routine, name: text })}
      />
      <Button title="Add Channel" onPress={() =>  handleAddChannel({})} />
      <FlatList
        data={routine.channels}
        keyExtractor={(item) => item.pin_id.toString()}
        renderItem={({ item: channel }) => (
          <View>
            <Text>Channel ID: {channel.id}</Text>
            <Button
              title="Remove Channel"
              onPress={() => handleRemoveChannel(channel.id)}
            />
            <Button
              title="Add Task"
              onPress={() => handleAddTask(channel.id)}
            />
            <FlatList
              data={channel.tasks}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item: task }) => (
                <View>
                  <Text>Task ID: {task.id}</Text>
                  <Button
                    title="Remove Task"
                    onPress={() =>
                      handleRemoveTask(channel.id, task.id)
                    }
                  />
                  {/* Add other UI elements for task editing */}
                </View>
              )}
            />
          </View>
        )}
      />
      <Button title="Save" onPress={() => {/* Update the routine */}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
});

export default EditRoutineScreen;
