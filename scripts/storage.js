const DATA_KEY = "sft:data:v3";
const SETTINGS_KEY = "sft:settings:v3";

export function loadData() {
  try { return JSON.parse(localStorage.getItem(DATA_KEY) || "[]"); }
  catch { return []; }
}

export function saveData(records) {
  localStorage.setItem(DATA_KEY, JSON.stringify(records));
}

export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null"); }
  catch { return null; }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const keys = { DATA_KEY, SETTINGS_KEY };