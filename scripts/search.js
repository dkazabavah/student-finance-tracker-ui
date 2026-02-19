export function compileRegex(input, flags = "i") {
  try {
    if (!input) return null;
    return new RegExp(input, flags);
  } catch {
    return null;
  }
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function highlight(text, re) {
  const safe = escapeHtml(text);
  if (!re) return safe;

  const src = re.source;
  const flags = re.flags.includes("g") ? re.flags : (re.flags + "g");
  const rg = new RegExp(src, flags);

  return safe.replace(rg, (m) => (m ? `<mark>${m}</mark>` : ""));
}