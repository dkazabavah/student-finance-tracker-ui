import { state, setView, setSort, setSearch, addRecord, updateRecord, deleteRecord, setSettings } from "./state.js";
import { validateTxn, validateRates, validateCap } from "./validators.js";
import { compileRegex, highlight } from "./search.js";

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

  // Records UI
  tbody: $("#recordsTbody"),
  cards: $("#recordsCards"),
  regexInput: $("#regexInput"),
  caseToggle: $("#caseToggle"),
  regexHint: $("#regexHint"),
  sortBy: $("#sortBy"),

  // Form
  form: $("#txnForm"),
  editId: $("#editId"),
  description: $("#description"),
  amount: $("#amount"),
  category: $("#category"),
  date: $("#date"),
  resetBtn: $("#resetBtn"),
  deleteBtn: $("#deleteBtn"),

  errDescription: $("#errDescription"),
  errAmount: $("#errAmount"),
  errCategory: $("#errCategory"),
  errDate: $("#errDate"),

  // Dashboard stats
  statTotalRecords: $("#statTotalRecords"),
  statTotalSpent: $("#statTotalSpent"),
  statTopCategory: $("#statTopCategory"),
  statCap: $("#statCap"),
  statCapMsg: $("#statCapMsg"),
  statCurrencyNote: $("#statCurrencyNote"),
  trendBars: $("#trendBars"),
  trendLabels: $("#trendLabels"),

  // Settings
  baseCurrency: $("#baseCurrency"),
  rateUSD: $("#rateUSD"),
  rateEUR: $("#rateEUR"),
  capValue: $("#capValue"),
  categoriesInput: $("#categoriesInput"),
  saveRatesBtn: $("#saveRatesBtn"),
  saveCapBtn: $("#saveCapBtn"),
  saveCatsBtn: $("#saveCatsBtn"),
  exportBtn: $("#exportBtn"),
  importBtn: $("#importBtn"),
  importArea: $("#importArea"),
  exportArea: $("#exportArea"),
  downloadSeedBtn: $("#downloadSeedBtn"),

  // About
  githubLink: $("#githubLink"),
  emailLink: $("#emailLink"),

  // Live regions
  liveStatus: $("#liveStatus"),
  liveAlert: $("#liveAlert"),

  year: $("#year"),
};

function announceStatus(msg) {
  els.liveStatus.textContent = msg;
}

function announceAlert(msg) {
  els.liveAlert.textContent = msg;
}

function formatMoney(n) {
  const base = state.settings.baseCurrency || "RWF";
  // simple formatting, no Intl dependencies for rubric
  const v = Number(n || 0);
  return `${base} ${v.toFixed(2)}`;
}

function topCategory(records) {
  const counts = new Map();
  for (const r of records) counts.set(r.category, (counts.get(r.category) || 0) + 1);
  let top = null;
  let best = 0;
  for (const [k, v] of counts.entries()) {
    if (v > best) { best = v; top = k; }
  }
  return top || "—";
}

function last7DaysTrend(records) {
  // returns array of 7 days (old->new): {label, total}
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
    // polite
    announceStatus(`You are under cap. Remaining ${formatMoney(diff)}.`);
  } else {
    els.statCapMsg.textContent = `Over by: ${formatMoney(Math.abs(diff))}`;
    // assertive
    announceAlert(`Cap exceeded! Over by ${formatMoney(Math.abs(diff))}.`);
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

  if (pattern && !re) {
    els.regexHint.textContent = "Invalid regex pattern. Fix it to filter/highlight.";
    els.regexHint.style.color = "var(--bad)";
  } else {
    els.regexHint.textContent = "Type a regex pattern. Invalid patterns won’t crash the app.";
    els.regexHint.style.color = "";
  }

  let items = [...state.records];

  if (re) {
    items = items.filter((r) => {
      const hay = `${r.date} ${r.description} ${r.category} ${r.amount}`;
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

  // Table
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

    const tdAmt = document.createElement("td");
    tdAmt.className = "num mark-wrap";
    tdAmt.innerHTML = highlight(formatMoney(r.amount), re);

    const tdAct = document.createElement("td");
    tdAct.innerHTML = actionButtonsHTML(r.id);

    tr.append(tdDate, tdDesc, tdCat, tdAmt, tdAct);
    els.tbody.appendChild(tr);
  }

  // Cards (mobile)
  els.cards.innerHTML = "";
  for (const r of items) {
    const div = document.createElement("article");
    div.className = "card";
    div.innerHTML = `
      <div class="card-row"><span class="k">Date</span><span class="mark-wrap">${highlight(r.date, re)}</span></div>
      <div class="card-row"><span class="k">Description</span><span class="mark-wrap">${highlight(r.description, re)}</span></div>
      <div class="card-row"><span class="k">Category</span><span class="pill mark-wrap">${highlight(r.category, re)}</span></div>
      <div class="card-row"><span class="k">Amount</span><span class="mark-wrap">${highlight(formatMoney(r.amount), re)}</span></div>
      ${actionButtonsHTML(r.id)}
    `;
    els.cards.appendChild(div);
  }

  announceStatus(`Rendered ${items.length} record(s).`);
}

function clearFormErrors() {
  els.errDescription.textContent = "";
  els.errAmount.textContent = "";
  els.errCategory.textContent = "";
  els.errDate.textContent = "";
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
  setFormMode(true);
}

function resetForm() {
  els.editId.value = "";
  els.form.reset();
  clearFormErrors();
  setFormMode(false);
}

function showPanel(view) {
  Object.entries(els.panels).forEach(([k, el]) => {
    el.hidden = k !== view;
  });

  els.tabs().forEach((b) => {
    const active = b.dataset.tab === view;
    b.setAttribute("aria-current", active ? "page" : "false");
  });

  // focus main for keyboard users
  $("#main").focus({ preventScroll: true });
}

function isImportValid(arr) {
  if (!Array.isArray(arr)) return { ok: false, msg: "JSON must be an array of records." };

  const required = ["id", "description", "amount", "category", "date", "createdAt", "updatedAt"];
  for (let i = 0; i < arr.length; i++) {
    const r = arr[i];
    if (!r || typeof r !== "object") return { ok: false, msg: `Record #${i + 1} is not an object.` };
    for (const key of required) {
      if (!(key in r)) return { ok: false, msg: `Record #${i + 1} missing key: ${key}` };
    }
    if (typeof r.id !== "string") return { ok: false, msg: `Record #${i + 1} id must be string.` };
    if (typeof r.description !== "string") return { ok: false, msg: `Record #${i + 1} description must be string.` };
    if (typeof r.category !== "string") return { ok: false, msg: `Record #${i + 1} category must be string.` };
    if (typeof r.date !== "string") return { ok: false, msg: `Record #${i + 1} date must be string.` };
    if (typeof r.amount !== "number") return { ok: false, msg: `Record #${i + 1} amount must be number.` };

    // Validate with existing regex rules
    const errs = validateTxn({
      description: r.description,
      amount: String(r.amount),
      category: r.category,
      date: r.date,
    });
    if (Object.keys(errs).length) {
      return { ok: false, msg: `Record #${i + 1} fails validation (check date/amount/category/description).` };
    }
  }
  return { ok: true };
}

function bindEvents() {
  // Tabs
  els.tabs().forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.tab;
      setView(v);
      showPanel(v);
      if (v === "dashboard") renderDashboard();
      if (v === "records") renderRecords();
    });
  });

  // Search
  els.regexInput.addEventListener("input", () => {
    setSearch({ pattern: els.regexInput.value, caseInsensitive: els.caseToggle.checked });
    renderRecords();
  });
  els.caseToggle.addEventListener("change", () => {
    setSearch({ pattern: els.regexInput.value, caseInsensitive: els.caseToggle.checked });
    renderRecords();
  });

  // Sort
  els.sortBy.addEventListener("change", () => {
    setSort(els.sortBy.value);
    renderRecords();
  });

  // Table/Card action delegation
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
      announceStatus(`Editing ${id}`);
      els.description.focus();
    }

    if (action === "delete") {
      const ok = confirm(`Delete ${id}? This cannot be undone.`);
      if (!ok) return;
      const changed = deleteRecord(id);
      if (changed) {
        announceStatus(`Deleted ${id}`);
        renderRecords();
        renderDashboard();
        // If currently editing same id, reset
        if (els.editId.value === id) resetForm();
      }
    }
  };
  els.tbody.addEventListener("click", handleAction);
  els.cards.addEventListener("click", handleAction);

  // Form submit
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFormErrors();

    const payload = {
      description: els.description.value,
      amount: els.amount.value,
      category: els.category.value,
      date: els.date.value,
    };

    const errors = validateTxn(payload);
    if (errors.description) els.errDescription.textContent = errors.description;
    if (errors.amount) els.errAmount.textContent = errors.amount;
    if (errors.category) els.errCategory.textContent = errors.category;
    if (errors.date) els.errDate.textContent = errors.date;

    if (Object.keys(errors).length) {
      announceAlert("Fix form errors and try again.");
      return;
    }

    const id = els.editId.value.trim();
    if (!id) {
      addRecord(payload);
      announceStatus("Record added.");
    } else {
      updateRecord(id, payload);
      announceStatus("Record updated.");
    }

    resetForm();
    renderRecords();
    renderDashboard();
    setView("records");
    showPanel("records");
  });

  els.resetBtn.addEventListener("click", () => {
    resetForm();
    announceStatus("Form cleared.");
  });

  els.deleteBtn.addEventListener("click", () => {
    const id = els.editId.value.trim();
    if (!id) return;
    const ok = confirm(`Delete ${id}? This cannot be undone.`);
    if (!ok) return;
    const changed = deleteRecord(id);
    if (changed) {
      resetForm();
      renderRecords();
      renderDashboard();
      announceStatus(`Deleted ${id}`);
      setView("records");
      showPanel("records");
    }
  });

  // Settings
  els.saveRatesBtn.addEventListener("click", () => {
    const baseCurrency = els.baseCurrency.value;
    const rateUSD = els.rateUSD.value.trim();
    const rateEUR = els.rateEUR.value.trim();
    const errs = validateRates({ rateUSD, rateEUR });
    if (Object.keys(errs).length) {
      announceAlert(Object.values(errs).join(" "));
      return;
    }
    setSettings({ baseCurrency, rateUSD, rateEUR });
    announceStatus("Currency settings saved.");
    renderDashboard();
    renderRecords();
  });

  els.saveCapBtn.addEventListener("click", () => {
    const res = validateCap(els.capValue.value);
    if (!res.ok) {
      announceAlert(res.msg);
      return;
    }
    setSettings({ cap: res.value });
    announceStatus("Cap saved.");
    renderDashboard();
  });

  els.saveCatsBtn.addEventListener("click", () => {
    const raw = els.categoriesInput.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // basic validation with same category regex rule (letters/spaces/hyphens)
    const bad = raw.find((c) => !/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(c));
    if (bad) {
      announceAlert(`Invalid category: "${bad}". Use letters/spaces/hyphens.`);
      return;
    }

    setSettings({ categories: raw.length ? raw : state.settings.categories });
    announceStatus("Categories saved.");
  });

  els.exportBtn.addEventListener("click", () => {
    els.exportArea.value = JSON.stringify(state.records, null, 2);
    announceStatus("Export generated (copy from the box).");
  });

  els.downloadSeedBtn.addEventListener("click", () => {
    // a simple seed template generator
    const seed = [
      { id:"rec_0001", description:"Lunch at cafeteria", amount:1250.00, category:"Food", date:"2025-09-25", createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }
    ];
    els.exportArea.value = JSON.stringify(seed, null, 2);
    announceStatus("Seed template generated in Export box.");
  });

  els.importBtn.addEventListener("click", () => {
    let parsed;
    try {
      parsed = JSON.parse(els.importArea.value);
    } catch {
      announceAlert("Invalid JSON. Fix syntax and try again.");
      return;
    }
    const v = isImportValid(parsed);
    if (!v.ok) {
      announceAlert(v.msg);
      return;
    }
    // replace all records
    state.records = parsed;
    announceStatus(`Imported ${parsed.length} records.`);
    // persist through state module function (simple direct call)
    // (we can't import persistAll here without circular; so use setSettings no-op trick?)
    // Better: just call localStorage directly here:
    localStorage.setItem("sft:data:v1", JSON.stringify(state.records));

    renderDashboard();
    renderRecords();
    setView("records");
    showPanel("records");
  });
}

export function initUI() {
  // Init settings fields
  els.baseCurrency.value = state.settings.baseCurrency;
  els.rateUSD.value = state.settings.rateUSD || "";
  els.rateEUR.value = state.settings.rateEUR || "";
  els.capValue.value = state.settings.cap ?? "";
  els.categoriesInput.value = (state.settings.categories || []).join(", ");

  // About links
  els.githubLink.href = state.settings.user.github;
  els.githubLink.textContent = state.settings.user.github;
  els.emailLink.href = `mailto:${state.settings.user.email}`;
  els.emailLink.textContent = state.settings.user.email;

  // init controls
  els.caseToggle.checked = state.search.caseInsensitive;
  els.sortBy.value = state.sort;

  els.year.textContent = String(new Date().getFullYear());

  // Default view
  showPanel(state.view);
  renderDashboard();
  renderRecords();

  bindEvents();
}
