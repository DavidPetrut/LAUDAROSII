# Rehearse → „Order-ul Producției" — Build Plan

Sursă: meeting cu **Paula** (transcript 1h27m) + 8 fițuici de program adnotate manual. Scop: tab-ul **Rehearse (RH)** devine *bread & butter*-ul echipei de producție — un order propriu, curat, doar cu ce-i interesează pe ei (lumini, proiecție, sunet, game de tranziție, remindere), pe care azi îl printează și-l mâzgălesc cu pixul.

## ⚠️ Fițuicile = durerea, NU ținta

Cele 8 poze cu foi printate și mâzgălite sunt **ce se chinuie ei azi manual** — nu modelul de urmat. În meeting David îi spune Paulei literal „vă chinuiți cu asta, n-ai vrea să facem diferit?". Deci **NU replicăm** structura aia (cârnați de titluri, săgeți peste tot, note înghesuite pe margini). Luăm doar *nevoia din spate* (ce informație le trebuie) și o reimaginăm **curat, digital, diferit**. Zero fotocopie digitală a hârtiei.

## Principii (nenegociabile)

1. **RH e strict read-only față de Order.** Order (liderul de închinare) rămâne sursa de adevăr. RH citește structura LIVE din Order (gamă, voci, secvență, tranziții) și **auto-refresh**. Modificările producătorilor se scriu DOAR într-un strat separat (`pc_productionSheets`) — **niciodată** înapoi în `PcPlanItem`. „Update zi aici, dar nu invers" (Paula).
2. **Reuse, nu reinventare.** Refolosim: `LightsEditor`, `ItemDrawer`, randarea de item/secvență/tranziție din Order, badge-urile de gamă, vederea „structură simplificată" din Songs/Words, `.pc-card` + tokens + `DESIGN.md`. Nimic full-width inutil, zero denumiri duplicate/redundante (icon în loc de text repetat), rânduri scurte, modular.
3. **Un singur tab, nu aplicație separată.** Rămâne în RH (max 4–5 tab-uri). Funcționează pe laptop (principal la programe stufoase) ȘI pe mobil (colaps + remindere ca icon).
4. **Per-producător.** Paula / Luca / Andrei au fiecare order-ul lor (note, denumiri, șabloane), cu opțiune de **share**. „N-o să găsești 2 persoane care fac la fel."
5. **Print-friendly color** — înlocuiește foaia printată și mâzgălită.

## Arhitectură de date (aditiv, zero migrare distructivă)

**`pc_productionSheets`** (colecție nouă, overlay peste Order):
- `orgId, planId, ownerId` (PcPerson producător) sau `scope:"team"` (partajat).
- `items: [{ itemId→PcPlanItem, label(override scurt), sceneId, fixtures:[{fixture, color}], sectionCues:[{section, lights:[{color,label}], projection, note}], projection:[{bgRef,note}], reminders:[{text,icon,severity,anchor}], note(personal) }]`
- `reminders: [{ afterItemId, text, icon:"stop|warn|info", severity, color }]` — remindere „oriunde", independente de secvență.
- `simFeedback: [{ text, sim:"1|2", severity, createdAt, done }]` — secțiunea de jos (feedback între programe).

**`pc_lightScenes`** (sau extensie la `pc_lightArrangements` existent): presetări de scenă `{name, fixtures:[{fixture,color}], intensityNote}`. Seed cu cele 7 scene standard: **Intrare sală, Worship, Worship cină, Anunțuri, Filmuleț, Predică, Moment de rugăciune.** Fixtures: **Par, LED, Tobe, Laterale, Coroană.**

**`pc_productionTemplates`** (per producător): seturi salvate de denumiri/note/scene (ca să nu refacă de fiecare dată).

**Modificări aditive în Order (`PcPlanItem`):** doar `transition.kind` += `"direct"` (tranziție directă) — restul (lights[], transition{key,autoKey,lights}, voices, sequence) EXISTĂ deja.

## Faze

### Faza 0 — Fundație (date + sync one-way)
- Model `pc_productionSheets` + index `(orgId, planId, ownerId)`.
- Rută backend `GET /plans/:id/production` = merge **Order live** (PcPlanItem) ⊕ overlay (după `itemId`); `PATCH` scrie DOAR overlay. Auto-refresh ca la Order.
- `productionApi` în `lib/api/client.js`. Gate pe capabilitate producător (reuse access per-funcționalitate existent).
- RH citește structura din Order; itemii șterși/reordonați în Order se reflectă (overlay orfan = ignorat).

### Faza 1 — RH ca „production order" vizual
- Randare order complet, dar **redus la ce-i interesează**: titlu **scurt** + **gamă** + **cine cântă** (S/A/T). Ascuns: autor/sursă/`[... bpm 12/8]` (reduc „cârnatul" de 90% din rând → Paula).
- `label` custom per cântec (rename inline, persistat per producător) — ex. „Aprinde-mă" în loc de titlul lung.
- Secțiuni (headere), tranziții (inclusiv **directă**) cu săgeată vizuală „înainte de următoarea". Rânduri scurte, fără dublu-rând. Reuse componente Order în „mod producție".

### Faza 2 — Lumini
- Librărie **scene** (seed cele 7) + **fixtures** (Par/LED/Tobe/Laterale/Coroană) cu culori — **reuse `LightsEditor`** (adaug etichete de fixture). „Set complet = scenă + 4 culori."
- Per-item: alegi scena (sau o lași standard). Fără intensități numerice (presetate) — doar label-ul scenei.
- **Lumini pe secțiune**: atașezi culoare/notă la un *chorus/bridge* anume (ex. „pe C2 → roșu") — prin vederea „structură simplificată" (reuse din Words). Apare colorat + se **printează color**.

### Faza 3 — Proiecție + Remindere + Spotify
- **Proiecție/fundal** per item/secțiune: notă/ref de fundal („coroană", „fundal până la C2", „intro negru"). Confirmat de fițuici.
- **Remindere oriunde** cu **icon** (stop/warn), roșu/important, plasabile între itemi — ex. „**oprește Spotify**". Independente de secvență (acoperă ce nu ține de si cosuri).
- **Gamă Spotify + relativa**: calculat din gama primului cântec + relativa (ex. „Spotify: C (rel. Am)"), pe rândurile pre-serviciu („Muzică de fundal" / „Countdown"). Ajută și sunetiștii. Auto din Order.
- Quick-fix: rândurile pre-serviciu „(VERSURI)" → descriere editabilă corectă (e deja editabil în Order).

### Faza 4 — Personalizare producător
- Overlay per-producător (Paula/Luca/Andrei fiecare al lui), **note personale**, **șabloane** de denumiri/note, **share** către alt producător.
- Access control: doar echipa de producție editează; cine face luminile se decide cu liderii (configurabil).

### Faza 5 — SIM feedback + Print
- Secțiune jos **feedback SIM1/SIM2** (remindere roșii „nu uita X", bifabile). Pe mobil = **icon roșu** care deschide lista.
- **Vedere print** color, o pagină curată — înlocuiește foaia mâzgălită.

### Faza 6 — Later / opțional (doar cu OK)
- Teleprompter/timpi: scroll automat + start/stop + skip + „colaps ce-a trecut" (pe mobil minimizat jos).
- Click-track/pad în gamă (reuse din Songs) pentru producători.

## Reuse concret (fișiere existente)
- `components/plans/order/LightsEditor.jsx` → culori fixtures + scene.
- `components/plans/order/ItemDrawer.jsx` → drawer de editare overlay per item.
- `components/plans/order/TransitionEditor.jsx` → + „tranziție directă".
- Vederea Words/structură simplificată (Songs) → lumini/proiecție pe secțiune.
- `app/(app)/plans/[id]/page.jsx` `RehearseTab` → rescris pe noul model.
- `.pc-card`, tokens, `DESIGN.md`.

## Verificare
- `node --check` backend; restart `server/index.js` (nu e hot-reload).
- Web 4100 compilează curat; verific în pagina LOGATĂ.
- **DB read-only**: confirm că PATCH pe RH scrie DOAR în `pc_productionSheets` și NICIODATĂ în `pc_planItems` (dovada one-way). Order neatins.
