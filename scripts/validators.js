// Core regex rules from spec + one advanced rule.
export const RE = {
  // forbid leading/trailing spaces and collapse doubles (we validate & also normalize)
  descNoEdgeSpaces: /^\S(?:.*\S)?$/,
  numberMoney: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  dateYMD: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // Advanced: duplicate word back-reference (case-insensitive via /i in code)
  dupWord: /\b(\w+)\s+\1\b/i,
};

export function normalizeSpaces(s) {
  return s.replace(/\s+/g, " ").trim();
}

export function validateTxn({ description, amount, category, date }) {
  const errors = {};

  const desc = String(description ?? "");
  const cat = String(category ?? "");
  const amt = String(amount ?? "");
  const d = String(date ?? "");

  if (!RE.descNoEdgeSpaces.test(desc)) {
    errors.description = "No leading/trailing spaces. Use normal spacing.";
  } else if (RE.dupWord.test(desc)) {
    errors.description = "Duplicate word detected (e.g., 'coffee coffee').";
  }

  if (!RE.numberMoney.test(amt)) {
    errors.amount = "Enter a valid number (0, 10, 10.5, 10.50).";
  }

  if (!RE.category.test(cat)) {
    errors.category = "Letters, spaces, and hyphens only (e.g., 'Bus Pass').";
  }

  if (!RE.dateYMD.test(d)) {
    errors.date = "Use YYYY-MM-DD (e.g., 2025-09-29).";
  }

  return errors;
}

export function validateRates({ rateUSD, rateEUR }) {
  // Allow empty, else must match numeric (0 or positive with up to 6 decimals here)
  const re = /^(0|[1-9]\d*)(\.\d{1,6})?$/;
  const errors = {};
  const usd = String(rateUSD ?? "").trim();
  const eur = String(rateEUR ?? "").trim();

  if (usd && !re.test(usd)) errors.rateUSD = "Invalid USD rate format.";
  if (eur && !re.test(eur)) errors.rateEUR = "Invalid EUR rate format.";
  return errors;
}

export function validateCap(capValue) {
  const re = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
  const v = String(capValue ?? "").trim();
  if (!v) return { ok: true, value: null };
  if (!re.test(v)) return { ok: false, msg: "Cap must be a valid number." };
  return { ok: true, value: Number(v) };
}
