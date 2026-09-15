/**
 * Generator al HARTII de arhitectura ("app map") pentru modul de testare.
 *
 * De ce exista: cand un tester raporteaza un bug, vrem ca promptul generat sa
 * spuna INSTANT nu doar fisierul ecranului, ci si CE globale (componente/functii/
 * contexte/stiluri) foloseste acel ecran si CE "domenii" (api, auth, realtime,
 * notificari, tema, DB) sunt implicate. Asa un AI merge direct la sursa, fara sa
 * scaneze tot repo-ul.
 *
 * Cum: analiza STATICA a importurilor. Scaneaza `screens/` + `global/` +
 * `public/styles/`, rezolva importurile named prin barrel-uri (index.js) pana la
 * fisierul real, si scrie `appMap.generated.json`. Ruleaza cu:
 *     node global/testing/generateAppMap.js        (din folderul app/)
 * sau `npm run appmap`. Scalabil: adaugi 500 de foldere -> ruleaza din nou, gata.
 *
 * NOTE: build-script Node (CommonJS). Nu e importat de aplicatie, deci nu intra
 * in bundle-ul Expo/Metro.
 */

const fs = require("fs");
const path = require("path");

const APP_ROOT = path.resolve(__dirname, "..", "..");
const OUT_FILE = path.join(__dirname, "appMap.generated.json");
const SCAN_DIRS = ["screens", "global", "public/styles"];

// Domenii "fast-access": zone transversale unde te duci pentru un DIAGNOSTIC
// rapid (ex: "nu se incarca ecranul" -> api/realtime, nu CSS). Seed stabil;
// fiecare cale e verificata sa existe cand se genereaza harta.
const DOMAIN_SEED = {
  api: ["global/functions/api.js"],
  auth: ["global/context/AuthContext.js", "../server/middleware/roles.js"],
  realtime: ["global/services/socket.js"],
  notificari: ["global/services/notifications.js", "global/context/NotificationContext.js"],
  tema: ["global/context/ThemeContext.js", "public/styles/global"],
  storage: ["global/utils/storage.js"],
  toast: ["global/functions/toast.js", "global/context/ToastContext.js"],
  db: ["../server/config", "../server/models"],
};

// Mapare fisier-global -> domeniu (reverse din seed), pentru "domainsTouched".
const FILE_TO_DOMAIN = {};
for (const [domain, files] of Object.entries(DOMAIN_SEED)) {
  for (const f of files) FILE_TO_DOMAIN[f.replace(/^\.\.\//, "")] = domain;
}

const toApp = (abs) => path.relative(APP_ROOT, abs).replace(/\\/g, "/");
const exists = (rel) => fs.existsSync(path.join(APP_ROOT, rel));

function walk(dirRel, out = []) {
  const abs = path.join(APP_ROOT, dirRel);
  if (!fs.existsSync(abs)) return out;
  for (const name of fs.readdirSync(abs)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const childRel = path.posix.join(dirRel, name);
    const childAbs = path.join(APP_ROOT, childRel);
    if (fs.statSync(childAbs).isDirectory()) walk(childRel, out);
    else if (name.endsWith(".js")) out.push(childRel);
  }
  return out;
}

// Prima linie utila de comentariu dintr-un fisier = scopul lui pe scurt.
function purposeOf(rel) {
  try {
    const lines = fs.readFileSync(path.join(APP_ROOT, rel), "utf8").split("\n");
    for (const raw of lines) {
      const l = raw.trim().replace(/^\/\*+|\*+\/$|^\*+\s?|^\/\/\s?/g, "").trim();
      if (l && !l.startsWith("import") && !l.startsWith("export") && l.length > 8) return l.slice(0, 120);
    }
  } catch (e) {}
  return "";
}

// Rezolva o cale de import (relativa) la un fisier real din repo.
function resolveModule(fromDirRel, raw) {
  if (!raw.startsWith(".")) return { external: raw }; // node_modules / RN
  const baseRel = path.posix.normalize(path.posix.join(fromDirRel, raw));
  if (exists(baseRel + ".js")) return { file: baseRel + ".js" };
  if (exists(path.posix.join(baseRel, "index.js"))) return { barrel: baseRel, file: path.posix.join(baseRel, "index.js") };
  if (exists(baseRel)) return { barrel: baseRel };
  return { file: baseRel + ".js", missing: true };
}

// Parseaza un barrel (index.js): nume-exportat -> fisier tinta rezolvat.
function parseBarrel(indexRel) {
  const dirRel = path.posix.dirname(indexRel);
  const src = fs.readFileSync(path.join(APP_ROOT, indexRel), "utf8");
  const map = {};
  const re = /export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const target = resolveModule(dirRel, m[2]);
    for (let spec of m[1].split(",")) {
      spec = spec.trim();
      if (!spec) continue;
      const alias = spec.includes(" as ") ? spec.split(" as ")[1].trim() : spec.trim();
      map[alias] = target.file || target.barrel || null;
    }
  }
  return map;
}

// Toate barrel-urile din global/ + public/styles (orice folder cu index.js).
function collectBarrels() {
  const barrels = {};
  for (const base of ["global", "public/styles"]) {
    for (const f of walk(base)) {
      if (path.posix.basename(f) === "index.js") barrels[path.posix.dirname(f)] = parseBarrel(f);
    }
  }
  return barrels;
}

// Parseaza importurile unui fisier (suporta multi-linie).
function parseImports(src) {
  const out = [];
  const re = /import\s+([\s\S]*?)\s+from\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const clause = m[1].trim();
    const names = [];
    const braced = clause.match(/\{([^}]*)\}/);
    if (braced) for (let s of braced[1].split(",")) { s = s.trim(); if (s) names.push(s.split(" as ").pop().trim()); }
    const def = clause.replace(/\{[^}]*\}/, "").replace(/\*\s*as\s*\w+/, "").replace(/,/g, "").trim();
    if (def) names.push(def);
    out.push({ names, source: m[2] });
  }
  return out;
}

// Cross-referinta cu screenRegistry.js: fisier ecran -> { tab, screen, route }.
function readScreenRegistry() {
  const byFile = {};
  try {
    const src = fs.readFileSync(path.join(APP_ROOT, "global/testing/screenRegistry.js"), "utf8");
    const re = /(\w+):\s*\{\s*tab:\s*"([^"]*)",\s*screen:\s*"([^"]*)",\s*folder:\s*"([^"]*)",\s*file:\s*"([^"]*)"\s*\}/g;
    let m;
    while ((m = re.exec(src))) byFile[m[5]] = { route: m[1], tab: m[2], screen: m[3] };
  } catch (e) {}
  return byFile;
}

function build() {
  const barrels = collectBarrels();
  const registry = readScreenRegistry();

  // Catalog de globale pe categorie (din barrel-urile din global/).
  const globals = {};
  for (const [dirRel, map] of Object.entries(barrels)) {
    if (!dirRel.startsWith("global/")) continue;
    const cat = dirRel.split("/")[1];
    globals[cat] = globals[cat] || {};
    for (const [name, file] of Object.entries(map)) {
      if (file) globals[cat][name] = { file, purpose: purposeOf(file) };
    }
  }

  const screens = {};
  const reverseGlobals = {};

  for (const fileRel of walk("screens")) {
    const bn = path.posix.basename(fileRel);
    if (bn === "index.js" || bn === "styles.js") continue;
    const dirRel = path.posix.dirname(fileRel);
    const src = fs.readFileSync(path.join(APP_ROOT, fileRel), "utf8");
    const imports = parseImports(src);

    const usedGlobals = [];
    const styleTokens = [];
    const crossScreens = [];
    const domains = new Set();
    let stylesFile = exists(path.posix.join(dirRel, "styles.js")) ? path.posix.join(dirRel, "styles.js") : null;

    for (const imp of imports) {
      const res = resolveModule(dirRel, imp.source);
      if (res.external) continue;
      const barrelKey = res.barrel;
      // Import dintr-un barrel global -> expandeaza fiecare nume la fisierul real.
      if (barrelKey && barrels[barrelKey]) {
        for (const n of imp.names) {
          const target = barrels[barrelKey][n];
          if (!target) continue;
          if (barrelKey.startsWith("public/styles")) { styleTokens.push(n); }
          else if (target.startsWith("global/")) {
            usedGlobals.push({ name: n, file: target });
            (reverseGlobals[target] = reverseGlobals[target] || []).push(fileRel);
            if (FILE_TO_DOMAIN[target]) domains.add(FILE_TO_DOMAIN[target]);
          }
        }
      } else if (res.file && res.file.startsWith("public/styles")) {
        for (const n of imp.names) styleTokens.push(n);
      } else if (res.file && res.file.startsWith("global/")) {
        usedGlobals.push({ name: imp.names[0] || "?", file: res.file });
        (reverseGlobals[res.file] = reverseGlobals[res.file] || []).push(fileRel);
        if (FILE_TO_DOMAIN[res.file]) domains.add(FILE_TO_DOMAIN[res.file]);
      } else if (res.file && res.file.startsWith("screens/") && path.posix.dirname(res.file) !== dirRel) {
        crossScreens.push(res.file);
      }
    }

    screens[fileRel] = {
      ...(registry[fileRel] || {}),
      stylesFile,
      globals: usedGlobals,
      styleTokens: [...new Set(styleTokens)],
      crossScreens: [...new Set(crossScreens)],
      domainsTouched: [...domains],
    };
  }

  // Verifica ce cai din domenii exista cu adevarat (semnaleaza drift).
  const domainsOut = {};
  for (const [d, files] of Object.entries(DOMAIN_SEED)) {
    domainsOut[d] = files.map((f) => ({ path: f, exists: f.startsWith("../") ? fs.existsSync(path.join(APP_ROOT, f)) : exists(f) }));
  }

  return {
    generatedAt: new Date().toISOString(),
    appRoot: "app",
    note: "Generat automat de global/testing/generateAppMap.js. NU edita manual.",
    domains: domainsOut,
    globals,
    screens,
    reverseGlobals: Object.fromEntries(Object.entries(reverseGlobals).map(([k, v]) => [k, [...new Set(v)]])),
  };
}

const map = build();
fs.writeFileSync(OUT_FILE, JSON.stringify(map, null, 2));
console.log(`appMap: ${Object.keys(map.screens).length} ecrane, ${Object.values(map.globals).reduce((a, o) => a + Object.keys(o).length, 0)} globale -> ${toApp(OUT_FILE)}`);
