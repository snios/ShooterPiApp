import React, { useLayoutEffect, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
} from "react-native";
import { AntDesign } from "@expo/vector-icons"; // Make sure to install the vector-icons package
import { useShooterApiContext } from "../contexts/ShooterAPIContext";
import { TaskRow } from "../components/TaskRow";

const ViewRoutineScreen = ({ navigation, route }) => {
  const { id } = route.params;
  const [expandedChannels, setExpandedChannels] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const { routinesApi, pinsApi } = useShooterApiContext();
  const [routine, setRoutine] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState(false);

  // Fetch the routine by ID when the component mounts
  useEffect(() => {
    const fetchRoutine = async () => {
      setIsLoading(true);
      try {
        const fetchedRoutine = await routinesApi.get(id); // Replace with your API call
        setRoutine(fetchedRoutine.data);
      } catch (error) {
        console.error("Error fetching routine:", error);
      }
      setIsLoading(false);
    };

    fetchRoutine();
  }, [id]);

  useLayoutEffect(() => {
    if (routine) {
      navigation.setOptions({ title: routine.name });
    }
  }, [navigation, routine]);

  // Function to add a new task to a channel
  const handleAddTask = (channel_id) => {
    const updatedChannels = routine.channels.map((channel) => {
      if (channel.id !== channel_id) return channel;
      // Check if there are any tasks in this channel
      if (channel.tasks.length === 0) {
        // If no tasks, add a default task
        return {
          ...channel,
          tasks: [...channel.tasks, { operation: "on", duration: 5 }], // You might want to add an id here
        };
      } else {
        // If tasks exist, add a new task based on the last task
        const lastTask = channel.tasks[channel.tasks.length - 1];
        const newOperation = lastTask.operation === "on" ? "off" : "on";
        const newDuration = lastTask.duration;

        return {
          ...channel,
          tasks: [
            ...channel.tasks,
            { operation: newOperation, duration: newDuration },
          ], // You might want to add an id here
        };
      }
    });

    // Optimistic update
    const updatedRoutine = {
      ...routine,
      channels: updatedChannels,
    };

    setRoutine(updatedRoutine);
    setPendingUpdates(true);
  };

  const handleRun = () => {
    setIsRunning(true);
    routinesApi
      .run(routine.id)
      .then((response) => {
        // Handle success if needed
        setIsRunning(false);
      })
      .catch((error) => {
        setIsRunning(false);
        // Handle error if needed
        console.error("Error running routine:", error);
      });
  };

  const handleUpdateTask = async (taskId, updatedData) => {
    // Find the channel and task to update
    const updatedChannels = routine.channels.map((channel) => {
      const updatedTasks = channel.tasks.map((task) => {
        if (task.id !== taskId) return task;

        return {
          ...task,
          ...updatedData,
        };
      });

      return {
        ...channel,
        tasks: updatedTasks,
      };
    });

    // Optimistic update for a better user experience
    const updatedRoutine = {
      ...routine,
      channels: updatedChannels,
    };

    setRoutine(updatedRoutine);
    setPendingUpdates(true);
  };

  const handleDeleteTask = (task_id) => {
    let found = false;
    const updatedChannels = routine.channels.map((channel) => {
      const updatedTasks = channel.tasks.filter((task) => {
        if (task.id === task_id) {
          found = true;
          return false;
        }
        return true;
      });

      if (found) {
        return {
          ...channel,
          tasks: updatedTasks,
        };
      }
      return channel;
    });

    if (!found) {
      console.warn("Task not found");
      return;
    }

    // Optimistic update
    const updatedRoutine = {
      ...routine,
      channels: updatedChannels,
    };

    setRoutine(updatedRoutine);
    setPendingUpdates(true);
  };

  const handleSaveUpdates = async () => {
    try {
      const response = await routinesApi.update(routine.id, routine); // Replace with your actual API call
      // If the API returns the updated routine, use it to update the state
      if (response.data) {
        setRoutine(response.data);
      }
      setPendingUpdates(false);
    } catch (error) {
      console.error("Error updating task:", error);
      // Optionally, revert the optimistic update
      setRoutine(routine);
      setPendingUpdates(false);
    }
  };

  const renderChannelItem = ({ item }) => (
    <View style={styles.channelItemContainer}>
      <View style={styles.channelHeader}>
        <TouchableOpacity
          onPress={() => {
            if (expandedChannels.includes(item.id)) {
              setExpandedChannels((prev) =>
                prev.filter((id) => id !== item.id)
              );
            } else {
              setExpandedChannels((prev) => [...prev, item.id]);
            }
          }}
        >
          <Text style={styles.channelName}>{`Channel ${item.pin_id}`}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (expandedChannels.includes(item.id)) {
              setExpandedChannels((prev) =>
                prev.filter((id) => id !== item.id)
              );
            } else {
              setExpandedChannels((prev) => [...prev, item.id]);
            }
          }}
        >
          <AntDesign
            name={expandedChannels.includes(item.id) ? "up" : "down"}
            size={20}
            color="black"
          />
        </TouchableOpacity>
      </View>

      {expandedChannels.includes(item.id) ? (
        <View style={{marginTop: 6}}>
          <FlatList
            data={item.tasks}
            renderItem={({ item: task, index }) => (
              <TaskRow
                task={task}
                id={task.id}
                handleUpdateTask={handleUpdateTask}
                handleDeleteTask={handleDeleteTask}
              />
            )}
            keyExtractor={(item, index) => index.toString()}
          />
          <Button
            title="Add Task"
            onPress={() =>
              handleAddTask(item.id, { operation: "on", duration: 5 })
            }
          />
        </View>
      ) : null}
    </View>
  );

  if (isLoading || !routine) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={routine.channels}
        renderItem={renderChannelItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
      {isRunning && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.overlayText}>Routine Running...</Text>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.playButton,
          isRunning && styles.playButtonRunning,
          pendingUpdates && styles.saveButton,
        ]}
        disabled={isRunning}
        onPress={pendingUpdates ? handleSaveUpdates : handleRun} // Choose the appropriate function
      >
        <AntDesign
          name={pendingUpdates ? "save" : "playcircleo"}
          size={48}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    marginTop: 16,
  },
  channelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  channelItemContainer: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  channelItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  expandedChannelItem: {
    marginBottom: 24,
  },
  channelName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  operation: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
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

export default ViewRoutineScreen;
