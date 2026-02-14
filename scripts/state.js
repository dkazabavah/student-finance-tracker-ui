import { loadData, saveData, loadSettings, saveSettings } from "./storage.js";

import { normalizeSpaces } from "./validators.js";

function nowISO() {
  return new Date().toISOString();
}

function nextId(records) {
  // rec_0001 style
  const max = records.reduce((acc, r) => {
    const n = Number(String(r.id || "").replace("rec_", "")) || 0;
    return Math.max(acc, n);
  }, 0);
  const next = String(max + 1).padStart(4, "0");
  return `rec_${next}`;
}

const DEFAULT_SETTINGS = {
  baseCurrency: "RWF",
  rateUSD: "0.00075",
  rateEUR: "0.00069",
  cap: null,
  categories: ["Food", "Books", "Transport", "Entertainment", "Fees", "Other"],
  user: {
    github: "https://github.com/dkazabavah",
    email: "d.kazabavah@alustudent.com",
  },
};

export const state = {
  records: loadData(),
  settings: loadSettings() || DEFAULT_SETTINGS,
  view: "dashboard",
  search: { pattern: "", caseInsensitive: true },
  sort: "date_desc",
};

export function persistAll() {
  saveData(state.records);
  saveSettings(state.settings);
}

export function addRecord({ description, amount, category, date }) {
  const createdAt = nowISO();
  const rec = {
    id: nextId(state.records),
    description: normalizeSpaces(description),
    amount: Number(String(amount).trim()),
    category: normalizeSpaces(category),
    date: String(date).trim(),
    createdAt,
    updatedAt: createdAt,
  };
  state.records.unshift(rec);
  persistAll();
  return rec;
}

export function updateRecord(id, patch) {
  const idx = state.records.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const curr = state.records[idx];
  const updated = {
    ...curr,
    ...patch,
    description: patch.description != null ? normalizeSpaces(patch.description) : curr.description,
    category: patch.category != null ? normalizeSpaces(patch.category) : curr.category,
    amount: patch.amount != null ? Number(String(patch.amount).trim()) : curr.amount,
    date: patch.date != null ? String(patch.date).trim() : curr.date,
    updatedAt: nowISO(),
  };
  state.records[idx] = updated;
  persistAll();
  return updated;
}

export function deleteRecord(id) {
  const before = state.records.length;
  state.records = state.records.filter((r) => r.id !== id);
  const changed = state.records.length !== before;
  if (changed) persistAll();
  return changed;
}

export function setSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  persistAll();
}

export function setView(view) {
  state.view = view;
}

export function setSort(sort) {
  state.sort = sort;
}

export function setSearch({ pattern, caseInsensitive }) {
  state.search.pattern = pattern;
  state.search.caseInsensitive = caseInsensitive;
}
