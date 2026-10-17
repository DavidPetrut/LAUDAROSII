/**
 * Coordonatele (px) ale cursorului într-un <textarea> — ca să ancorăm tooltip-uri (autocomplete,
 * picker de acorduri) FIX la caret. Metoda „mirror div" (clasică, textarea-caret-position, MIT).
 */
const PROPS = [
  "direction", "boxSizing", "width", "height", "overflowX", "overflowY",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize", "fontSizeAdjust",
  "lineHeight", "fontFamily", "textAlign", "textTransform", "textIndent",
  "letterSpacing", "wordSpacing", "tabSize", "whiteSpace", "wordWrap", "wordBreak",
];

export function getCaretCoordinates(el, position) {
  if (typeof document === "undefined") return { x: 0, y: 0, height: 16 };
  const div = document.createElement("div");
  const cs = window.getComputedStyle(el);
  const s = div.style;
  s.position = "absolute"; s.visibility = "hidden";
  s.whiteSpace = "pre-wrap"; s.wordWrap = "break-word";
  PROPS.forEach((p) => { s[p] = cs[p]; });
  s.overflow = "hidden";
  div.textContent = el.value.substring(0, position);
  const span = document.createElement("span");
  span.textContent = el.value.substring(position) || ".";
  div.appendChild(span);
  document.body.appendChild(div);
  const x = span.offsetLeft + parseInt(cs.borderLeftWidth || "0", 10);
  const y = span.offsetTop + parseInt(cs.borderTopWidth || "0", 10);
  const height = parseInt(cs.lineHeight || cs.fontSize || "16", 10) || 16;
  document.body.removeChild(div);
  return { x: x - el.scrollLeft, y: y - el.scrollTop, height };
}
