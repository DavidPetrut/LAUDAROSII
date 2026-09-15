/**
 * Inspector de elemente pentru WEB/LOCAL (rulează DOAR în browser, pe PC).
 *
 * Pe nativ (APK) nu există DOM, așa că raportul se ancorează într-un punct pe
 * screenshot (native-point). Pe web însă avem DOM-ul real: putem evidenția
 * elementul de sub cursor (ca la "Inspect Element" din Chrome), iar la click
 * extragem un descriptor bogat + stack-ul de componente React (din fiber) și
 * handler-ele atașate. Rezultatul e mult mai precis pentru cel care repară.
 *
 * NU are efecte la import (nu atinge `document` la nivel de modul). Tot ce e DOM
 * se întâmplă doar când `startWebInspect` e apelat, iar acela e chemat exclusiv
 * din contextul web (vezi BugReporter, gărdit cu Platform.OS === "web").
 *
 * GDPR: nu colectăm valori de input, token-uri sau date personale — doar
 * structura elementului (tag, id, testID, text vizibil scurt, poziție).
 */

const HL_ID = "__bugreporter_inspect_highlight__";
const LABEL_ID = "__bugreporter_inspect_label__";

const clamp = (s, n) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : null);

// Găsește fiber-ul React atașat pe un nod DOM (dev + prod bundles).
const getFiber = (node) => {
  if (!node) return null;
  const key = Object.keys(node).find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
  );
  return key ? node[key] : null;
};

// Numele "prietenos" al unei componente dintr-un fiber (sare peste host-uri string).
const fiberName = (fiber) => {
  const t = fiber?.type;
  if (!t || typeof t === "string") return null;
  const name =
    t.displayName ||
    t.name ||
    (t.render && (t.render.displayName || t.render.name)) ||
    (t.type && (t.type.displayName || t.type.name));
  if (!name) return null;
  if (/^(Unknown|Anonymous|_default|ForwardRef|Memo)$/i.test(name)) return null;
  return name;
};

// Urcă lanțul de fibers și adună: stack de componente + handler-e + testID/label.
const readReactInfo = (node) => {
  const stack = [];
  const handlers = new Set();
  let testId = null;
  let label = null;
  try {
    let f = getFiber(node);
    let hops = 0;
    while (f && hops < 30) {
      const name = fiberName(f);
      if (name && stack[stack.length - 1] !== name) stack.push(name);

      const props = f.memoizedProps;
      if (props && typeof props === "object") {
        for (const k of Object.keys(props)) {
          if (/^on[A-Z]/.test(k) && typeof props[k] === "function") handlers.add(k);
        }
        if (!testId) testId = props.testID || props["data-testid"] || null;
        if (!label) label = props.accessibilityLabel || props["aria-label"] || null;
      }
      f = f.return;
      hops++;
    }
  } catch (e) {}
  return {
    // outer -> inner ca să se citească natural (ex: ProfileScreen > EditForm > SaveButton)
    componentStack: stack.length ? stack.slice(0, 8).reverse() : undefined,
    handlers: handlers.size ? Array.from(handlers).slice(0, 8) : undefined,
    testId: clamp(testId, 120),
    label: clamp(label, 200),
  };
};

// Selector CSS scurt, best-effort (pentru orientare, nu pentru rulare).
const shortSelector = (el) => {
  try {
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4 && node.tagName !== "BODY") {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${node.id}`;
        parts.unshift(part);
        break;
      }
      const cls = (node.getAttribute("class") || "")
        .split(/\s+/)
        .filter((c) => c && c.length < 24)
        .slice(0, 2)
        .join(".");
      if (cls) part += `.${cls}`;
      const parent = node.parentElement;
      if (parent) {
        const sibs = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return clamp(parts.join(" > "), 400);
  } catch (e) {
    return null;
  }
};

// Construiește descriptorul bogat al elementului selectat.
export const describeElement = (el) => {
  const rect = el.getBoundingClientRect();
  const react = readReactInfo(el);
  return {
    kind: "dom-element",
    tag: clamp(el.tagName ? el.tagName.toLowerCase() : "", 40),
    domId: clamp(el.id || null, 120),
    testId: react.testId || clamp(el.getAttribute?.("data-testid") || null, 120),
    label: react.label || clamp(el.getAttribute?.("aria-label") || null, 200),
    text: clamp(el.innerText || el.textContent || "", 200) || null,
    selector: shortSelector(el),
    componentStack: react.componentStack,
    handlers: react.handlers,
    rect: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    view: {
      width: Math.round(window.innerWidth || 0),
      height: Math.round(window.innerHeight || 0),
    },
  };
};

// Elementele proprii ale inspectorului (highlight/label) nu trebuie selectabile.
const isOwnOverlay = (el) =>
  !!el && (el.id === HL_ID || el.id === LABEL_ID || el.closest?.(`#${HL_ID},#${LABEL_ID}`));

/**
 * Pornește modul de inspecție. Returnează o funcție de cleanup.
 * @param {(el: Element, descriptor: object) => void} onPick
 * @param {() => void} onCancel
 */
export const startWebInspect = (onPick, onCancel) => {
  if (typeof document === "undefined") return () => {};

  const hl = document.createElement("div");
  hl.id = HL_ID;
  Object.assign(hl.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483646",
    border: "2px solid #FF00E5",
    background: "rgba(255,0,229,0.12)",
    borderRadius: "3px",
    transition: "all 40ms linear",
    display: "none",
  });

  const label = document.createElement("div");
  label.id = LABEL_ID;
  Object.assign(label.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483647",
    background: "#111827",
    color: "#fff",
    font: "600 11px/1.4 system-ui, sans-serif",
    padding: "3px 7px",
    borderRadius: "6px",
    maxWidth: "70vw",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    display: "none",
  });

  document.body.appendChild(hl);
  document.body.appendChild(label);

  let current = null;

  const paint = (el) => {
    const r = el.getBoundingClientRect();
    hl.style.display = "block";
    hl.style.left = `${r.left}px`;
    hl.style.top = `${r.top}px`;
    hl.style.width = `${r.width}px`;
    hl.style.height = `${r.height}px`;

    const info = readReactInfo(el);
    const name =
      (info.componentStack && info.componentStack[info.componentStack.length - 1]) ||
      (el.tagName ? el.tagName.toLowerCase() : "");
    const txt = clamp(el.innerText || "", 40);
    label.textContent = txt ? `${name} · "${txt}"` : name;
    label.style.display = "block";
    const lx = Math.min(r.left, (window.innerWidth || 0) - 220);
    const ly = r.top > 26 ? r.top - 24 : r.top + r.height + 4;
    label.style.left = `${Math.max(4, lx)}px`;
    label.style.top = `${ly}px`;
  };

  const onMove = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOwnOverlay(el)) return;
    current = el;
    paint(el);
  };

  const cleanup = () => {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("contextmenu", onCtx, true);
    hl.remove();
    label.remove();
  };

  const onClick = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || isOwnOverlay(el)) return;
    e.preventDefault();
    e.stopPropagation();
    const descriptor = describeElement(el);
    // Double-check pentru dev: afiseaza in consola EXACT ce s-a selectat (doar local/web).
    try {
      console.groupCollapsed(
        "%c[TEST · element selectat (LOCAL)]",
        "color:#0ea5e9;font-weight:bold",
        descriptor.componentStack ? descriptor.componentStack.join(" › ") : descriptor.tag,
      );
      console.log("Descriptor:", descriptor);
      console.log("Nod DOM real:", el);
      console.groupEnd();
    } catch (_) {}
    cleanup();
    onPick && onPick(el, descriptor);
  };

  const onKey = (e) => {
    if (e.key === "Escape") {
      cleanup();
      onCancel && onCancel();
    }
  };

  const onCtx = (e) => {
    e.preventDefault();
    cleanup();
    onCancel && onCancel();
  };

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("contextmenu", onCtx, true);

  return cleanup;
};
