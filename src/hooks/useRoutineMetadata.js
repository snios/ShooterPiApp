// hooks/useRoutineMetadata.js
import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system";

export const soundLabels = {
  ten_seconds: "10 sekunder kvar",
  ready: "Färdiga",
  fire: "Eld",
  ceasefire: "Eld upphör",
};

const soundKeys = [
  "ten_seconds",
  "fire",
  "ceasefire",
  "ready",
];

const defaultMetadata = {
  playSounds: Object.fromEntries(soundKeys.map((k) => [k, false])), //Default false on every sound..
};

export const useRoutineMetadata = (routineId) => {
  const [metadata, setMetadata] = useState(null);
  const path = `${FileSystem.documentDirectory}routine-meta-${routineId}.json`;

  const load = async () => {
    try {
      const exists = await FileSystem.getInfoAsync(path);
      if (exists.exists) {
        const content = await FileSystem.readAsStringAsync(path);
        setMetadata(JSON.parse(content));
      } else {
        setMetadata(defaultMetadata);
      }
    } catch (err) {
      console.warn("Failed to load routine metadata", err);
      setMetadata(defaultMetadata);
    }
  };

  const save = async (data) => {
    try {
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
      setMetadata(data);
    } catch (err) {
      console.error("Failed to save metadata", err);
    }
  };

  useEffect(() => {
    load();
  }, [routineId]);

  return {
    metadata,
    updateMetadata: save,
  };
};
