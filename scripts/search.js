export function compileRegex(input, flags = "i") {
  try {
    if (!input) return null;
    return new RegExp(input, flags);
  } catch {
    return null;
  }
}

// IMPORTANT: return HTML (safe enough for our controlled inputs; we still escape first)
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

  // Prevent infinite loop on zero-length matches
  const src = re.source;
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const rg = new RegExp(src, flags);

  return safe.replace(rg, (m) => {
    if (m === "") return "";
    return `<mark>${m}</mark>`;
  });
}
