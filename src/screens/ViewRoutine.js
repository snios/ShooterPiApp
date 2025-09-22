import React, {
  useLayoutEffect,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useShooterApiContext } from "../contexts/ShooterAPIContext";
import { TaskRow } from "../components/TaskRow";
import RoutineBar from "../components/RoutineBar";
import * as Crypto from "expo-crypto";
import { useKeepAwake } from "expo-keep-awake";
import usePrompt from "../hooks/usePrompt";
import { useAudioPlayer } from "expo-audio";
import { soundLabels, useRoutineMetadata } from "../hooks/useRoutineMetadata";
import { ThemedInput } from "@/components/ThemedInput";

const ten_seconds = require("../../assets/10sek.mp3");
const all_ready = require("../../assets/allaklara.mp3");
const fire = require("../../assets/eld.mp3");
const ceasefire = require("../../assets/seasefire.mp3");
const ready = require("../../assets/ready.mp3");
const load = require("../../assets/load.mp3");

const ViewRoutineScreen = ({ navigation, route }) => {
  useKeepAwake();

  const { id } = route.params;
  const [expandedChannels, setExpandedChannels] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // ✅ Nytt: räkna aktiva kanaler, undvik dubbel-done och separera callouts
  const [channelsLeft, setChannelsLeft] = useState(0);
  const completedPinsRef = useRef(new Set());
  const [isCalloutsActive, setIsCalloutsActive] = useState(false);
  const calloutTimersRef = useRef([]);

  const { programApi } = useShooterApiContext();
  const [routine, setRoutine] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState(false);
  const [callout, setCallout] = useState("");

  const playerTenSek = useAudioPlayer(ten_seconds);
  const playerReady = useAudioPlayer(ready);
  const playerAllReady = useAudioPlayer(all_ready);
  const playerSeaseFire = useAudioPlayer(ceasefire);
  const playerFire = useAudioPlayer(fire);
  const playerLoad = useAudioPlayer(load);

  // Metadata inkl. skjuttid & toggles
  const { metadata, updateMetadata } = useRoutineMetadata(routine?.id);

  const handleToggleSound = (key) => {
    if (!metadata) return;
    const updated = {
      ...metadata,
      playSounds: {
        ...metadata.playSounds,
        [key]: !metadata.playSounds[key],
      },
    };
    updateMetadata(updated);
  };

  const prompt = usePrompt();

  // Hämta rutin
  useEffect(() => {
    const fetchRoutine = async () => {
      setIsLoading(true);
      try {
        const fetchedRoutine = await programApi.getById(id);
        const processedData = {
          ...fetchedRoutine.data,
          pinConfigurations: fetchedRoutine.data.pinConfigurations.map(
            (config) => ({
              ...config,
              actions: config.actions.map((action) => ({
                ...action,
                id: Crypto.randomUUID(),
              })),
            })
          ),
        };
        setRoutine(processedData);
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

  // Add action
  const handleAddAction = (pin_id) => {
    const updatedChannels = routine.pinConfigurations.map((pinConfig) => {
      if (pinConfig.pin !== pin_id) return pinConfig;
      return {
        ...pinConfig,
        actions: [...pinConfig.actions, { id: Crypto.randomUUID(), action: 0 }],
      };
    });
    const updatedRoutine = { ...routine, pinConfigurations: updatedChannels };
    setRoutine(updatedRoutine);
    setPendingUpdates(true);
  };

  // Add delay
  const handleAddDelay = (pin_id) => {
    const updatedChannels = routine.pinConfigurations.map((pinConfig) => {
      if (pinConfig.pin !== pin_id) return pinConfig;
      return {
        ...pinConfig,
        actions: [
          ...pinConfig.actions,
          { id: Crypto.randomUUID(), delay: 5000 },
        ],
      };
    });
    const updatedRoutine = { ...routine, pinConfigurations: updatedChannels };
    setRoutine(updatedRoutine);
    setPendingUpdates(true);
  };

  // Starta körning + callouts
  const handleRun = async () => {
    // Räkna bara kanaler som faktiskt har actions
    const channelsToRun = (routine?.pinConfigurations ?? []).filter(
      (cfg) => Array.isArray(cfg.actions) && cfg.actions.length > 0
    ).length;

    completedPinsRef.current.clear();
    setChannelsLeft(channelsToRun);

    setIsRunning(true);
    setIsCalloutsActive(true);

    programApi
      .run(routine.id)
      .then(() => {
        // ev. hantera OK
      })
      .catch((error) => {
        console.error("Error running routine:", error);
        setIsRunning(false);
        // låt callouts fortsätta om du vill att "eld upphör" ändå ropas
        // vill du avbryta även callouts här? lägg till: setIsCalloutsActive(false);
      });
  };

  // Update action
  const handleUpdateAction = async (taskId, updatedData) => {
    const updatedpinConfigurations = routine.pinConfigurations.map(
      (pinConfiguration) => {
        const updatedActions = pinConfiguration.actions.map((action) => {
          if (action.id !== taskId) return action;
          return { id: action.id, ...updatedData };
        });

        return {
          ...pinConfiguration,
          actions: updatedActions,
        };
      }
    );

    const updatedRoutine = {
      ...routine,
      pinConfigurations: updatedpinConfigurations,
    };
    setRoutine(updatedRoutine);
    setPendingUpdates(true);
  };

  // Remove pin
  const handleRemovePinConfiguration = (pinId) => {
    Alert.alert(`Remove pin ${pinId}?`, "", [
      { text: "Cancel" },
      {
        text: "Yes",
        onPress: () => {
          const filteredPinConfigs = routine.pinConfigurations.filter(
            (x) => x.pin != pinId
          );
          const updatedRoutine = {
            ...routine,
            pinConfigurations: filteredPinConfigs,
          };
          setRoutine(updatedRoutine);
          setPendingUpdates(true);
        },
      },
    ]);
  };

  // Quick add pin
  handleQuickAddPinConfiguration = async () => {
    const userInput = await prompt();
    if (userInput !== null) {
      const pinConfig = { pin: userInput, actions: [] };
      const updatedRoutine = {
        ...routine,
        pinConfigurations: [...(routine.pinConfigurations || []), pinConfig],
      };
      setRoutine(updatedRoutine);
      setPendingUpdates(true);
    }
  };

  // Delete task
  const handleDeleteTask = (id) => {
    let found = false;
    const updatedpinConfigurations = routine.pinConfigurations.map(
      (pinConfiguration) => {
        const updatedActions = pinConfiguration.actions.filter((action) => {
          if (id === action.id) {
            found = true;
            return false;
          }
          return true;
        });

        if (found) {
          return {
            ...pinConfiguration,
            actions: updatedActions,
          };
        }
        return pinConfiguration;
      }
    );

    if (!found) {
      console.warn("Task not found");
      return;
    }

    const updatedRoutine = {
      ...routine,
      pinConfigurations: updatedpinConfigurations,
    };
    setRoutine(updatedRoutine);
    setPendingUpdates(true);
  };

  // Save updates
  const handleSaveUpdates = async () => {
    try {
      const response = await programApi.createOrUpdate(routine);
      if (response.data) {
        const processedData = {
          ...response.data,
          pinConfigurations: response.data.pinConfigurations.map((config) => ({
            ...config,
            actions: config.actions.map((action) => ({
              ...action,
              id: Crypto.randomUUID(),
            })),
          })),
        };
        setRoutine(processedData);
      }
      setPendingUpdates(false);
    } catch (error) {
      console.error("Error updating task:", error);
      setPendingUpdates(false);
    }
  };

  // Längsta total-delay per kanal (för fallback på skjuttid)
  const longestDelay = useMemo(() => {
    const calculateTotalDelay = (pinConfiguration) =>
      pinConfiguration.actions.reduce(
        (totalDelay, action) => totalDelay + (action.delay || 0),
        0
      );

    return routine?.pinConfigurations.reduce((maxDelay, config) => {
      const totalDelay = calculateTotalDelay(config);
      return Math.max(maxDelay, totalDelay);
    }, 0);
  }, [routine]);

  // 🔈 ENKLA CALLOUTS — frikopplade från isRunning
  useEffect(() => {
    if (!isCalloutsActive) return;

    const shootTimeMs =
      Number.isFinite(metadata?.shootTimeMs) && (metadata?.shootTimeMs ?? 0) > 0
        ? metadata.shootTimeMs
        : longestDelay || 60000;

    // Rensa ev. gamla timers
    calloutTimersRef.current.forEach(clearTimeout);
    calloutTimersRef.current = [];

    if (metadata?.playSounds?.ten_seconds) {
      setCallout("10 sekunder kvar");
      playerTenSek.seekTo(0);
      playerTenSek.play();
    }

    const t1 = setTimeout(() => {
      if (metadata?.playSounds?.ready) {
        playerReady.seekTo(0);
        playerReady.play();
        setCallout("Färdiga");
      }
    }, 7000);

    const t2 = setTimeout(() => {
      if (metadata?.playSounds?.fire) {
        playerFire.seekTo(0);
        playerFire.play();
        setCallout("ELD!!");
      }
    }, 9900);

    const t3 = setTimeout(() => {
      if (metadata?.playSounds?.ceasefire) {
        playerSeaseFire.seekTo(0);
        playerSeaseFire.play();
        setCallout("ELD...UPP...HÖR");
      }
      // Stäng callouts strax efter sista utropet
      const tDone = setTimeout(() => setIsCalloutsActive(false), 500);
      calloutTimersRef.current.push(tDone);
    }, Math.max(0, shootTimeMs - 3100));

    calloutTimersRef.current.push(t1, t2, t3);

    return () => {
      calloutTimersRef.current.forEach(clearTimeout);
      calloutTimersRef.current = [];
    };
  }, [
    isCalloutsActive,
    longestDelay,
    metadata,
    playerTenSek,
    playerReady,
    playerFire,
    playerSeaseFire,
  ]);

  // ✅ Stäng bara programmet när alla aktiva kanaler är klara
  useEffect(() => {
    if (isRunning && channelsLeft === 0) {
      setIsRunning(false);
      // OBS: låt isCalloutsActive leva vidare tills "eld upphör" har ropats
    }
  }, [isRunning, channelsLeft]);

  // Räkna ner säkert (ingen dubbelräkning per pin)
  const onChannelDone = useCallback((pin) => {
    if (completedPinsRef.current.has(pin)) return;
    completedPinsRef.current.add(pin);
    setChannelsLeft((n) => Math.max(0, n - 1));
  }, []);

  // Render kanal
  const renderChannelItem = ({ item }) => {
    const hasActions = Array.isArray(item.actions) && item.actions.length > 0;

    return (
      <>
        <View style={styles.channelItemContainer}>
          <View style={styles.channelHeader}>
            <TouchableOpacity
              onLongPress={() => handleRemovePinConfiguration(item.pin)}
              onPress={() => {
                if (expandedChannels.includes(item.pin)) {
                  setExpandedChannels((prev) =>
                    prev.filter((id) => id !== item.pin)
                  );
                } else {
                  setExpandedChannels((prev) => [...prev, item.pin]);
                }
              }}
            >
              <Text style={styles.channelName}>{`Pin ${item.pin}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (expandedChannels.includes(item.pin)) {
                  setExpandedChannels((prev) =>
                    prev.filter((id) => id !== item.pin)
                  );
                } else {
                  setExpandedChannels((prev) => [...prev, item.pin]);
                }
              }}
            >
              <AntDesign
                name={expandedChannels.includes(item.pin) ? "up" : "down"}
                size={20}
                color="black"
              />
            </TouchableOpacity>
          </View>

          {expandedChannels.includes(item.pin) ? (
            <View style={{ marginTop: 6 }}>
              <FlatList
                keyboardShouldPersistTaps="always"
                data={item.actions}
                renderItem={({ item: action }) => (
                  <TaskRow
                    task={action}
                    id={action.id}
                    handleUpdateTask={handleUpdateAction}
                    handleDeleteTask={handleDeleteTask}
                  />
                )}
                keyExtractor={(action) => action.id}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Button
                  title="+ Action"
                  onPress={() => handleAddAction(item.pin)}
                />
                <Button
                  title="+ Delay"
                  onPress={() => handleAddDelay(item.pin)}
                />
              </View>
            </View>
          ) : null}
        </View>

        <RoutineBar
          tasks={item.actions}
          start={isRunning && hasActions} // starta inte tomma kanaler
          onAnimationDone={() => onChannelDone(item.pin)} // räkna ner, inte stäng allt
        />
      </>
    );
  };

  if (isLoading || !routine) return <Text>Loading...</Text>;

  const shootTimeSecDisplay = String(
    Math.max(0, Math.round((metadata?.shootTimeMs ?? longestDelay) / 1000))
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
    >
      <View style={styles.container}>
        <FlatList
          keyboardShouldPersistTaps="always"
          data={routine.pinConfigurations ?? []}
          renderItem={renderChannelItem}
          keyExtractor={(item) => item.pin.toString()}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <View style={{ margin: 16 }}>
              <Button
                title="Add pin"
                onPress={handleQuickAddPinConfiguration}
              />
            </View>
          }
        />

        {(isRunning || isCalloutsActive) && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.overlayText}>{callout}</Text>
          </View>
        )}

        <View className="manualButtonRow" style={styles.manualButtonRow}>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => {
              playerLoad.seekTo(0);
              playerLoad.play();
            }}
          >
            <Text style={styles.manualButtonText}>Ladda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => {
              playerAllReady.seekTo(0);
              playerAllReady.play();
            }}
          >
            <Text style={styles.manualButtonText}>Alla klara?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.togglePanel}>
          <Text style={styles.togglePanelTitle}>Automatiska ljudutrop</Text>

          <View style={styles.shootTimeRow}>
            <Text style={styles.toggleLabel}>Skjuttid (sek)</Text>
            <ThemedInput
              keyboardType="numeric"
              value={shootTimeSecDisplay}
              onChangeText={(val) => {
                const num = Number((val || "").replace(",", "."));
                if (!Number.isFinite(num)) return;
                const ms = Math.max(0, Math.round(num * 1000));
                updateMetadata({
                  ...(metadata || {}),
                  playSounds: metadata?.playSounds ?? {
                    ten_seconds: true,
                    ready: true,
                    fire: true,
                    ceasefire: true,
                  },
                  shootTimeMs: ms,
                });
              }}
            />
          </View>

          {Object.keys(soundLabels).map((key) => (
            <View key={key} style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{soundLabels[key]}</Text>
              <Switch
                value={metadata?.playSounds?.[key] ?? true}
                onValueChange={() => handleToggleSound(key)}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.playButton,
            isRunning && styles.playButtonRunning,
            pendingUpdates && styles.saveButton,
          ]}
          disabled={isRunning}
          onPress={pendingUpdates ? handleSaveUpdates : handleRun}
        >
          <AntDesign
            name={pendingUpdates ? "save" : "playcircleo"}
            size={48}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    zIndex: 10, // 👈 viktigt!
  },
  overlayText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  manualButtonRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 16,
    marginHorizontal: 16,
  },

  manualButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 6,
    alignItems: "center",
  },

  manualButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  togglePanel: {
    margin: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 3,
  },

  togglePanelTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  toggleLabel: {
    fontSize: 16,
    color: "#333",
  },
  shootTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  shootTimeInput: {
    width: 90,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: "center",
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007A5A",
  },
});

export default ViewRoutineScreen;
