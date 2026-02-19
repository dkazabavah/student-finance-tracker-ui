export const RE = {
  descNoEdgeSpaces: /^\S(?:.*\S)?$/,
  numberMoney: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  dateYMD: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  dupWord: /\b(\w+)\s+\1\b/i,
  url: /^(https?:\/\/)[^\s]+$/i
};

export function normalizeSpaces(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

export function validateTxn({ description, amount, category, date, receiptUrl }) {
  const errors = {};
  const desc = String(description ?? "");
  const cat = String(category ?? "");
  const amt = String(amount ?? "");
  const d = String(date ?? "");
  const url = String(receiptUrl ?? "").trim();

  if (!RE.descNoEdgeSpaces.test(desc)) errors.description = "Description is required.";
  else if (RE.dupWord.test(desc)) errors.description = "Please remove repeated words.";

  if (!RE.numberMoney.test(amt)) errors.amount = "Enter a valid amount.";
  if (!RE.category.test(cat)) errors.category = "Enter a valid category.";
  if (!RE.dateYMD.test(d)) errors.date = "Enter a valid date (YYYY-MM-DD).";

  if (url && !RE.url.test(url)) errors.receiptUrl = "Use a valid link starting with http:// or https://";

  return errors;
}

export function validateRates({ rateUSD, rateEUR }) {
  const re = /^(0|[1-9]\d*)(\.\d{1,10})?$/;
  const errors = {};
  const usd = String(rateUSD ?? "").trim();
  const eur = String(rateEUR ?? "").trim();

  if (usd && !re.test(usd)) errors.rateUSD = "Invalid USD rate.";
  if (eur && !re.test(eur)) errors.rateEUR = "Invalid EUR rate.";
  return errors;
}

export function validateCap(capValue) {
  const re = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
  const v = String(capValue ?? "").trim();
  if (!v) return { ok: true, value: null };
  if (!re.test(v)) return { ok: false, msg: "Cap must be a valid number." };
  return { ok: true, value: Number(v) };
}