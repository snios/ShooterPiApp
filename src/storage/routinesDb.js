// src/storage/routinesDb.js
import * as FileSystem from "expo-file-system";

export const ROUTINES_DB_PATH =
  FileSystem.documentDirectory + "routines_db.json";

export async function writeRoutinesDb(items) {
  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    count: Array.isArray(items) ? items.length : 0,
    items: Array.isArray(items) ? items : [],
  };

  // Skriv atomiskt: skriv till .tmp först, flytta sedan på plats
  const tmp = ROUTINES_DB_PATH + ".tmp";

  await FileSystem.writeAsStringAsync(tmp, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Ta bort ev. gammal fil (idempotent = inget fel om den saknas)
  await FileSystem.deleteAsync(ROUTINES_DB_PATH, { idempotent: true });

  // Flytta .tmp -> final
  await FileSystem.moveAsync({ from: tmp, to: ROUTINES_DB_PATH });

  return payload;
}

export async function readRoutinesDb() {
  const info = await FileSystem.getInfoAsync(ROUTINES_DB_PATH);
  if (!info.exists) return null;
  const text = await FileSystem.readAsStringAsync(ROUTINES_DB_PATH, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return JSON.parse(text);
}

export async function deleteRoutinesDb() {
  await FileSystem.deleteAsync(ROUTINES_DB_PATH, { idempotent: true });
}
