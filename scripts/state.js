import { loadData, saveData, loadSettings, saveSettings } from "./storage.js";
import { normalizeSpaces } from "./validators.js";

function nowISO() {
  return new Date().toISOString();
}

function nextId(records) {
  const max = records.reduce((acc, r) => {
    const n = Number(String(r.id || "").replace("rec_", "")) || 0;
    return Math.max(acc, n);
  }, 0);
  return `rec_${String(max + 1).padStart(4, "0")}`;
}

/*
  Default rates are prefilled using National Bank of Rwanda (BNR) selling rates
  from 18-Feb-2026 (manual mode):
  - USD selling: 1461.705 RWF  => 1 RWF ≈ 0.0006841326 USD
  - EUR selling: 1731.170317 RWF => 1 RWF ≈ 0.0005776439 EUR
*/
const DEFAULT_SETTINGS = {
  theme: "light",
  baseCurrency: "RWF",
  rateUSD: "0.0006841326",
  rateEUR: "0.0005776439",
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

export function addRecord({ description, amount, category, date, receiptUrl }) {
  const createdAt = nowISO();
  const rec = {
    id: nextId(state.records),
    description: normalizeSpaces(description),
    amount: Number(String(amount).trim()),
    category: normalizeSpaces(category),
    date: String(date).trim(),
    receiptUrl: String(receiptUrl || "").trim(),
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
    receiptUrl: patch.receiptUrl != null ? String(patch.receiptUrl).trim() : curr.receiptUrl,
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