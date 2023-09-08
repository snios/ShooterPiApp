import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Button, StyleSheet } from 'react-native';

import { useShooterApiContext } from '../contexts/ShooterAPIContext';
import PinPicker from '../components/PinPicker';

const CreateRoutineScreen = ({ navigation }) => {
  const  { pinsApi } = useShooterApiContext();
  const [routineName, setRoutineName] = useState('');
  const [numChannels, setNumChannels] = useState(1);
  const [channels, setChannels] = useState([
    {
      pin_id: '',
      tasks: [{ operation: '', duration: '' }],
    },
  ]);

  const addChannel = () => {
    setChannels((prevChannels) => [...prevChannels, { pin_id: '', tasks: [{ operation: '', duration: '' }] }]);
  };

  const addTask = (channelIndex) => {
    setChannels((prevChannels) =>
      prevChannels.map((channel, index) =>
        index === channelIndex ? { ...channel, tasks: [...channel.tasks, { operation: '', duration: '' }] } : channel
      )
    );
  };

  const removeChannel = (index) => {
    setChannels((prevChannels) => prevChannels.filter((_, i) => i !== index));
  };

  const removeTask = (channelIndex, taskIndex) => {
    setChannels((prevChannels) =>
      prevChannels.map((channel, index) =>
        index === channelIndex
          ? {
              ...channel,
              tasks: channel.tasks.filter((_, i) => i !== taskIndex),
            }
          : channel
      )
    );
  };

  const saveRoutine = () => {
    // Save the routine to the API or perform any other necessary actions
    // For demonstration purposes, we'll just log the routine details here
    console.log('Routine Name:', routineName);
    console.log('Channels:', channels);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Routine</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Routine Name"
        value={routineName}
        onChangeText={setRoutineName}
      />

      <ScrollView style={styles.channelsContainer}>
        {channels.map((channel, index) => (
          <View key={index} style={styles.channelContainer}>
            <Text style={styles.channelTitle}>Channel {channel.pin_id}</Text>
            <PinPicker onSelectPin={(pin) =>  {
                setChannels((prevChannels) =>
                prevChannels.map((chan, cIndex) => (cIndex === index ? { ...chan, pin_id: pin.id } : chan))
              );
            }}
            selectedPinId={channel.pin_id}
             />

            {channel.tasks.map((task, taskIndex) => (
              <View key={taskIndex} style={styles.taskContainer}>
                <TextInput
                  style={styles.taskInput}
                  placeholder="Operation (on/off/sleep)"
                  value={task.operation}
                  onChangeText={(text) => {
                    setChannels((prevChannels) =>
                      prevChannels.map((channel, cIndex) =>
                        cIndex === index
                          ? {
                              ...channel,
                              tasks: channel.tasks.map((t, tIndex) =>
                                tIndex === taskIndex ? { ...t, operation: text } : t
                              ),
                            }
                          : channel
                      )
                    );
                  }}
                />

                <TextInput
                  style={styles.taskInput}
                  placeholder="Duration"
                  value={task.duration}
                  onChangeText={(text) => {
                    setChannels((prevChannels) =>
                      prevChannels.map((channel, cIndex) =>
                        cIndex === index
                          ? {
                              ...channel,
                              tasks: channel.tasks.map((t, tIndex) =>
                                tIndex === taskIndex ? { ...t, duration: text } : t
                              ),
                            }
                          : channel
                      )
                    );
                  }}
                />

                <Button title="Remove Task" onPress={() => removeTask(index, taskIndex)} />
              </View>
            ))}

            <Button title="Add Task" onPress={() => addTask(index)} />
            {index > 0 && <Button title="Remove Channel" onPress={() => removeChannel(index)} />}
          </View>
        ))}
      </ScrollView>

      <Button title="Add Channel" onPress={addChannel} />

      <Button title="Save Routine" onPress={saveRoutine} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
  },
  channelsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  channelContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  taskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
    marginRight: 10,
  },
});

export default CreateRoutineScreen;
