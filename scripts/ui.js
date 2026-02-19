import { state, setView, setSort, setSearch, addRecord, updateRecord, deleteRecord, setSettings } from "./state.js";
import { validateTxn, validateRates, validateCap } from "./validators.js";
import { compileRegex, highlight } from "./search.js";
import { keys } from "./storage.js";

const $ = (sel) => document.querySelector(sel);

const els = {
  tabs: () => Array.from(document.querySelectorAll(".tab-btn")),
  panels: {
    dashboard: $("#panel-dashboard"),
    records: $("#panel-records"),
    add: $("#panel-add"),
    settings: $("#panel-settings"),
    about: $("#panel-about"),
  },

  tbody: $("#recordsTbody"),
  cards: $("#recordsCards"),
  regexInput: $("#regexInput"),
  caseToggle: $("#caseToggle"),
  regexHint: $("#regexHint"),
  sortBy: $("#sortBy"),

  form: $("#txnForm"),
  editId: $("#editId"),
  description: $("#description"),
  amount: $("#amount"),
  category: $("#category"),
  date: $("#date"),
  receiptUrl: $("#receiptUrl"),
  resetBtn: $("#resetBtn"),
  deleteBtn: $("#deleteBtn"),

  errDescription: $("#errDescription"),
  errAmount: $("#errAmount"),
  errCategory: $("#errCategory"),
  errDate: $("#errDate"),
  errReceipt: $("#errReceipt"),

  statTotalRecords: $("#statTotalRecords"),
  statTotalSpent: $("#statTotalSpent"),
  statTopCategory: $("#statTopCategory"),
  statCap: $("#statCap"),
  statCapMsg: $("#statCapMsg"),
  statCurrencyNote: $("#statCurrencyNote"),
  trendBars: $("#trendBars"),
  trendLabels: $("#trendLabels"),

  darkModeToggle: $("#darkModeToggle"),
  baseCurrency: $("#baseCurrency"),
  rateUSD: $("#rateUSD"),
  rateEUR: $("#rateEUR"),
  capValue: $("#capValue"),
  categoriesInput: $("#categoriesInput"),
  saveRatesBtn: $("#saveRatesBtn"),
  saveCapBtn: $("#saveCapBtn"),
  saveCatsBtn: $("#saveCatsBtn"),
  exportBtn: $("#exportBtn"),
  downloadExportBtn: $("#downloadExportBtn"),
  loadSeedBtn: $("#loadSeedBtn"),
  importBtn: $("#importBtn"),
  importArea: $("#importArea"),
  importFile: $("#importFile"),
  exportArea: $("#exportArea"),

  liveStatus: $("#liveStatus"),
  liveAlert: $("#liveAlert"),
};

function announceStatus(msg) { els.liveStatus.textContent = msg; }
function announceAlert(msg) { els.liveAlert.textContent = msg; }

function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  els.darkModeToggle.checked = t === "dark";
}

function formatMoney(n) {
  const base = state.settings.baseCurrency || "RWF";
  const v = Number(n || 0);
  return `${base} ${v.toFixed(2)}`;
}

function topCategory(records) {
  const counts = new Map();
  for (const r of records) counts.set(r.category, (counts.get(r.category) || 0) + 1);
  let top = null, best = 0;
  for (const [k, v] of counts.entries()) if (v > best) { best = v; top = k; }
  return top || "—";
}

function last7DaysTrend(records) {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${da}`;
    days.push({ key, label: `${m}/${da}`, total: 0 });
  }
  const map = new Map(days.map((x) => [x.key, x]));
  for (const r of records) {
    const slot = map.get(r.date);
    if (slot) slot.total += Number(r.amount || 0);
  }
  return days;
}

function applyCap(totalSpent) {
  const cap = state.settings.cap;
  if (cap == null) {
    els.statCap.textContent = "—";
    els.statCapMsg.textContent = "Set a cap in Settings.";
    return;
  }
  els.statCap.textContent = formatMoney(cap);
  const diff = cap - totalSpent;

  if (diff >= 0) {
    els.statCapMsg.textContent = `Remaining: ${formatMoney(diff)}`;
    announceStatus(`Remaining ${formatMoney(diff)}.`);
  } else {
    els.statCapMsg.textContent = `Over by: ${formatMoney(Math.abs(diff))}`;
    announceAlert(`Over cap by ${formatMoney(Math.abs(diff))}.`);
  }
}

function renderDashboard() {
  const records = state.records;
  const total = records.length;
  const sum = records.reduce((a, r) => a + Number(r.amount || 0), 0);

  els.statTotalRecords.textContent = String(total);
  els.statTotalSpent.textContent = formatMoney(sum);
  els.statTopCategory.textContent = topCategory(records);
  els.statCurrencyNote.textContent = `Base currency: ${state.settings.baseCurrency}`;

  applyCap(sum);

  const trend = last7DaysTrend(records);
  const max = Math.max(1, ...trend.map((x) => x.total));

  els.trendBars.innerHTML = "";
  els.trendLabels.innerHTML = "";

  trend.forEach((d) => {
    const h = Math.max(4, Math.round((d.total / max) * 120));
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${h}px`;
    bar.title = `${d.key}: ${formatMoney(d.total)}`;
    els.trendBars.appendChild(bar);

    const lab = document.createElement("span");
    lab.textContent = d.label;
    els.trendLabels.appendChild(lab);
  });
}

function getFilteredSortedRecords() {
  const { pattern, caseInsensitive } = state.search;
  const flags = caseInsensitive ? "i" : "";
  const re = compileRegex(pattern, flags);

  let items = [...state.records];

  if (pattern && !re) els.regexHint.textContent = "Search pattern is not valid.";
  else els.regexHint.textContent = "";

  if (re) {
    items = items.filter((r) => {
      const hay = `${r.date} ${r.description} ${r.category} ${r.amount} ${r.receiptUrl || ""}`;
      return re.test(hay);
    });
  }

  const s = state.sort;
  const cmpText = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });

  items.sort((a, b) => {
    switch (s) {
      case "date_asc": return cmpText(a.date, b.date);
      case "date_desc": return cmpText(b.date, a.date);
      case "desc_asc": return cmpText(a.description, b.description);
      case "desc_desc": return cmpText(b.description, a.description);
      case "amt_asc": return (a.amount || 0) - (b.amount || 0);
      case "amt_desc": return (b.amount || 0) - (a.amount || 0);
      default: return 0;
    }
  });

  return { items, re };
}

function actionButtonsHTML(id) {
  return `
    <div class="row-actions">
      <button class="btn" data-action="edit" data-id="${id}" type="button">Edit</button>
      <button class="btn danger" data-action="delete" data-id="${id}" type="button">Delete</button>
    </div>
  `;
}

function renderRecords() {
  const { items, re } = getFilteredSortedRecords();

  els.tbody.innerHTML = "";
  for (const r of items) {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.className = "mark-wrap";
    tdDate.innerHTML = highlight(r.date, re);

    const tdDesc = document.createElement("td");
    tdDesc.className = "mark-wrap";
    tdDesc.innerHTML = highlight(r.description, re);

    const tdCat = document.createElement("td");
    tdCat.className = "mark-wrap";
    tdCat.innerHTML = `<span class="pill">${highlight(r.category, re)}</span>`;

    const tdPhoto = document.createElement("td");
    tdPhoto.innerHTML = r.receiptUrl
      ? `<a href="${r.receiptUrl}" target="_blank" rel="noopener"><img class="thumb" src="${r.receiptUrl}" alt="Receipt"></a>`
      : `<span class="muted">—</span>`;

    const tdAmt = document.createElement("td");
    tdAmt.className = "num mark-wrap";
    tdAmt.innerHTML = highlight(formatMoney(r.amount), re);

    const tdAct = document.createElement("td");
    tdAct.innerHTML = actionButtonsHTML(r.id);

    tr.append(tdDate, tdDesc, tdCat, tdPhoto, tdAmt, tdAct);
    els.tbody.appendChild(tr);
  }

  els.cards.innerHTML = "";
  for (const r of items) {
    const div = document.createElement("article");
    div.className = "card";
    div.innerHTML = `
      <div class="card-row"><span class="k">Date</span><span class="mark-wrap">${highlight(r.date, re)}</span></div>
      <div class="card-row"><span class="k">Description</span><span class="mark-wrap">${highlight(r.description, re)}</span></div>
      <div class="card-row"><span class="k">Category</span><span class="pill mark-wrap">${highlight(r.category, re)}</span></div>
      <div class="card-row"><span class="k">Photo</span><span>${r.receiptUrl ? `<a href="${r.receiptUrl}" target="_blank" rel="noopener"><img class="thumb" src="${r.receiptUrl}" alt="Receipt"></a>` : `<span class="muted">—</span>`}</span></div>
      <div class="card-row"><span class="k">Amount</span><span class="mark-wrap">${highlight(formatMoney(r.amount), re)}</span></div>
      ${actionButtonsHTML(r.id)}
    `;
    els.cards.appendChild(div);
  }

  announceStatus(`Showing ${items.length} record(s).`);
}

function clearFormErrors() {
  els.errDescription.textContent = "";
  els.errAmount.textContent = "";
  els.errCategory.textContent = "";
  els.errDate.textContent = "";
  els.errReceipt.textContent = "";
}

function setFormMode(editing) {
  els.deleteBtn.disabled = !editing;
  els.form.querySelector(".primary").textContent = editing ? "Update" : "Save";
}

function fillForm(rec) {
  els.editId.value = rec.id;
  els.description.value = rec.description;
  els.amount.value = String(rec.amount);
  els.category.value = rec.category;
  els.date.value = rec.date;
  els.receiptUrl.value = rec.receiptUrl || "";
  setFormMode(true);
}

function resetForm() {
  els.editId.value = "";
  els.form.reset();
  clearFormErrors();
  setFormMode(false);
}

function showPanel(view) {
  Object.entries(els.panels).forEach(([k, el]) => { el.hidden = k !== view; });
  els.tabs().forEach((b) => {
    const active = b.dataset.tab === view;
    b.setAttribute("aria-current", active ? "page" : "false");
  });
  $("#main").focus({ preventScroll: true });
}

function isImportValid(arr) {
  if (!Array.isArray(arr)) return { ok: false, msg: "Import must be a list of records." };

  const required = ["id", "description", "amount", "category", "date", "createdAt", "updatedAt"];
  for (let i = 0; i < arr.length; i++) {
    const r = arr[i];
    if (!r || typeof r !== "object") return { ok: false, msg: `Record #${i + 1} is not valid.` };
    for (const key of required) if (!(key in r)) return { ok: false, msg: `Record #${i + 1} is missing: ${key}` };

    const errs = validateTxn({
      description: r.description,
      amount: String(r.amount),
      category: r.category,
      date: r.date,
      receiptUrl: r.receiptUrl || ""
    });
    if (Object.keys(errs).length) return { ok: false, msg: `Record #${i + 1} has invalid values.` };
  }
  return { ok: true };
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  els.tabs().forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.tab;
      setView(v);
      showPanel(v);
      if (v === "dashboard") renderDashboard();
      if (v === "records") renderRecords();
    });
  });

  els.regexInput.addEventListener("input", () => {
    setSearch({ pattern: els.regexInput.value, caseInsensitive: els.caseToggle.checked });
    renderRecords();
  });

  els.caseToggle.addEventListener("change", () => {
    setSearch({ pattern: els.regexInput.value, caseInsensitive: els.caseToggle.checked });
    renderRecords();
  });

  els.sortBy.addEventListener("change", () => {
    setSort(els.sortBy.value);
    renderRecords();
  });

  const handleAction = (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") {
      const rec = state.records.find((r) => r.id === id);
      if (!rec) return;
      fillForm(rec);
      setView("add");
      showPanel("add");
      els.description.focus();
    }

    if (action === "delete") {
      if (!confirm(`Delete ${id}?`)) return;
      if (deleteRecord(id)) {
        renderRecords();
        renderDashboard();
        if (els.editId.value === id) resetForm();
      }
    }
  };

  els.tbody.addEventListener("click", handleAction);
  els.cards.addEventListener("click", handleAction);

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFormErrors();

    const payload = {
      description: els.description.value,
      amount: els.amount.value,
      category: els.category.value,
      date: els.date.value,
      receiptUrl: els.receiptUrl.value,
    };

    const errors = validateTxn(payload);

    if (errors.description) els.errDescription.textContent = errors.description;
    if (errors.amount) els.errAmount.textContent = errors.amount;
    if (errors.category) els.errCategory.textContent = errors.category;
    if (errors.date) els.errDate.textContent = errors.date;
    if (errors.receiptUrl) els.errReceipt.textContent = errors.receiptUrl;

    if (Object.keys(errors).length) {
      announceAlert("Please fix the highlighted fields.");
      return;
    }

    const id = els.editId.value.trim();
    if (!id) addRecord(payload);
    else updateRecord(id, payload);

    resetForm();
    renderRecords();
    renderDashboard();
    setView("records");
    showPanel("records");
  });

  els.resetBtn.addEventListener("click", resetForm);

  els.deleteBtn.addEventListener("click", () => {
    const id = els.editId.value.trim();
    if (!id) return;
    if (!confirm(`Delete ${id}?`)) return;
    if (deleteRecord(id)) {
      resetForm();
      renderRecords();
      renderDashboard();
      setView("records");
      showPanel("records");
    }
  });

  els.darkModeToggle.addEventListener("change", () => {
    const theme = els.darkModeToggle.checked ? "dark" : "light";
    setSettings({ theme });
    applyTheme(theme);
  });

  els.saveRatesBtn.addEventListener("click", () => {
    const baseCurrency = els.baseCurrency.value;
    const rateUSD = els.rateUSD.value.trim();
    const rateEUR = els.rateEUR.value.trim();
    const errs = validateRates({ rateUSD, rateEUR });
    if (Object.keys(errs).length) {
      announceAlert("Please enter valid rates.");
      return;
    }
    setSettings({ baseCurrency, rateUSD, rateEUR });
    renderDashboard();
    renderRecords();
    announceStatus("Currency saved.");
  });

  els.saveCapBtn.addEventListener("click", () => {
    const res = validateCap(els.capValue.value);
    if (!res.ok) return announceAlert(res.msg);
    setSettings({ cap: res.value });
    renderDashboard();
    announceStatus("Cap saved.");
  });

  els.saveCatsBtn.addEventListener("click", () => {
    const raw = els.categoriesInput.value.split(",").map((s) => s.trim()).filter(Boolean);
    const bad = raw.find((c) => !/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(c));
    if (bad) return announceAlert(`Invalid category: "${bad}".`);
    setSettings({ categories: raw.length ? raw : state.settings.categories });
    announceStatus("Categories saved.");
  });

  els.exportBtn.addEventListener("click", () => {
    els.exportArea.value = JSON.stringify(state.records, null, 2);
  });

  els.downloadExportBtn.addEventListener("click", () => {
    const filename = `finance_records_${new Date().toISOString().slice(0,10)}.json`;
    downloadJson(filename, state.records);
  });

  els.loadSeedBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("./seed.json");
      const data = await res.json();
      const v = isImportValid(data);
      if (!v.ok) return announceAlert(v.msg);
      state.records = data;
      localStorage.setItem(keys.DATA_KEY, JSON.stringify(state.records));
      renderDashboard();
      renderRecords();
      announceStatus("Seed loaded.");
    } catch {
      announceAlert("Could not load seed.json.");
    }
  });

  els.importBtn.addEventListener("click", () => {
    let parsed;
    try { parsed = JSON.parse(els.importArea.value); }
    catch { return announceAlert("Invalid JSON."); }

    const v = isImportValid(parsed);
    if (!v.ok) return announceAlert(v.msg);

    state.records = parsed;
    localStorage.setItem(keys.DATA_KEY, JSON.stringify(state.records));
    renderDashboard();
    renderRecords();
    setView("records");
    showPanel("records");
    announceStatus("Imported successfully.");
  });

  els.importFile.addEventListener("change", async () => {
    const file = els.importFile.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const v = isImportValid(parsed);
      if (!v.ok) return announceAlert(v.msg);

      state.records = parsed;
      localStorage.setItem(keys.DATA_KEY, JSON.stringify(state.records));
      renderDashboard();
      renderRecords();
      announceStatus("Imported successfully.");
    } catch {
      announceAlert("Could not import that file.");
    } finally {
      els.importFile.value = "";
    }
  });
}

export function initUI() {
  applyTheme(state.settings.theme);

  els.baseCurrency.value = state.settings.baseCurrency;
  els.rateUSD.value = state.settings.rateUSD || "";
  els.rateEUR.value = state.settings.rateEUR || "";
  els.capValue.value = state.settings.cap ?? "";
  els.categoriesInput.value = (state.settings.categories || []).join(", ");

  els.caseToggle.checked = state.search.caseInsensitive;
  els.sortBy.value = state.sort;

  showPanel(state.view);
  renderDashboard();
  renderRecords();
  bindEvents();
}