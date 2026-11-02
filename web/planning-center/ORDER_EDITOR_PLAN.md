# Order — Editor personalizat de melodii (Mashup Studio) · PLAN COMPLET

> Status: **PLAN / DRAFT** · autor: Claude + David · 1 noiembrie 2026
> Scop: editor de melodii în tabul **Order** care permite: alterarea secvenței, editarea versurilor/acordurilor,
> **mashup** (unirea mai multor melodii prin „Transition next song"), și **3 moduri de salvare**
> (Temporar / Replace / Save as new), cu **AI-first**, **design flawless** și **arhitectură DB sigură**.
>
> REGULĂ DE AUR a acestui plan: *nimic „se face mai târziu"*. Fiecare detaliu e gândit acum.
> Dacă o fază nu e gata de decizie, întrebarea e în §12 (Întrebări), nu lăsată ambiguă.

---

## 0. Cei 3 piloni (nu se negociază)

1. **AI-first** — AI-ul vede TOT din editor (toate blocurile, toate melodiile aduse, versuri, secvență, game),
   primește un **catalog de ~100 comenzi** + **~150 reguli** pre-scrise (JSON, versionate în repo), propune,
   omul confirmă (human-in-the-loop existent, §10 arhitectură), execută prin ACELEAȘI acțiuni ca un click uman.
   `@mention` opțional; fără `@` AI-ul tot citește tot. **Antrenare**: buton 👍/👎 pe fiecare acțiune → se scrie o
   „lecție" persistentă care îmbunătățește promptul (memorie AI).
2. **Design flawless** — condus de **UI/UX Pro Max** + **21st** (reguli CLAUDE.md). Iconuri **EXCLUSIV Phosphor**.
   **FĂRĂ bare colorate**. Tokens din `globals.css`. Spațiere premium, animații/tranziții fine, drag live,
   stări complete (loading/empty/error), light & dark, ambele breakpoints, user-friendly.
3. **DB sigură** — originalele (`pc_songs`, `pc_arrangements`, `pc_keys`, `pc_songFiles`) **nu se strică NICIODATĂ**
   prin ceva temporar. Temporar = strict local pe acel Order. Definitiv = explicit, cu validare serioasă.
   Reutilizăm CRUD-ul existent din `songs.js` (soft-delete cu `deletedAt`). Nu reinventăm roata.

---

## 0.1 DECIZII CONFIRMATE (David, 1 nov 2026) — LOCKED

- **D1 (stocare temp):** melodia editată/mashup se **CLONEAZĂ** într-o entitate **izolată**, care există **DOAR în Order**,
  **separat** de biblioteca Songs. Single-edit SAU mashup → la fel. La mashup, melodiile originale **dispar din Order**
  și e adăugată automat „melodia temporară nouă". → implementare: colecție dedicată **`pc_tempSongs`** (NU în `pc_songs`),
  itemul ține `tempSongId`. Buton global **„Curăță melodiile temporare"** (purge tot). Volum mic (~10–15 / 1–2 ani).
- **D2 (ecran):** **Full-screen Studio**. DAR partea stângă = **~99% ca preview-ul curat**, NU ca `Lyrics & Chords`
  tehnic (fără `[C]` în paranteze „urât"). **Leader-friendly** (userii sunt lideri, non-muzicieni): înțeleg
  drag & drop, modificare scrisă, adăugare element, selectare+schimbare cu AI, și **prompt AI** („scrie ce vrei schimbat").
  **Undo (Ctrl+Z)** + reutilizăm autocomplete-ul din Songs. **Dialog cu AI** care face schimbările (motorul Claude),
  ținând cont de structură/sequence/aranjamente.
- **D3 (feedback AI/edit):** modalul de feedback apare **la „închide & salvează"**, în **mijloc**, NU imediat după
  fiecare modificare — ca liderul să vadă schimbările și să continue sau să schimbe.
- **D4 (model AI):** **Haiku default + Sonnet la comenzi grele**. **D5 (resurse Save-as-new):** **referință** la același `url`.
- **D6 (AI devreme — MANDATORIU):** AI prezent **din Faza 2**. ORICE funcționalitate care atinge DB/songs trebuie
  să poată fi făcută ȘI de AI. În fiecare fază viitoare, AI-ul primește capacitatea de a face **TOT** ce face și omul.
- **D7 (memorie/lecții AI):** **GLOBALE** pe organizație (nu per user). Acces la puțini oameni de încredere.
- **D8 (preseturi tranziție):** **GLOBALE** pe organizație (publice tuturor, nu notițe personale).
- **D9 (denumire Save as new):** exact „<Titlu> NOU 1 / 2 / …" (incremental).
- **D10 (cine editează în Studio):** deocamdată **toți** (cei care văd Order-ul); restricțiile vin mai târziu. (vezi clarificarea Q9)
- **D11 (autocomplete secțiuni):** array **întemeiat pe DB** (vocabularul real folosit — vezi `lib/songs/sectionTypes.js`,
  grounded din `pc_arrangements.sequence`), NU inventat. Ex. scrii „ve" → recomandă „Verse/Strofa". Reutilizează motorul existent.
- **D12 (Words la mashup):** regenerare automată Words (cu AI — ok la cost). Respectă mashup-ul: **fără** sequence-uri în Words;
  **un singur titlu** cu „+": „Melodie 1 + Melodie 2 + …". Human-readable: dacă titlul e prea lung, AI îl scurtează la **max 2 cuvinte/melodie**, separate cu „+".
- **D13 (model de salvare — Q12, CONFIRMAT):** editorul e **doar în memorie** până la Save. Orice schimbare
  (o melodie, mai multe, ștergi tot, mashup) e **temporară în state**; dacă NU dai Save (temporar / new / replace)
  și închizi cu **Cancel**, NU se persistă nimic — e ca și cum n-ai atins nimic, originalul rămâne curat.
  **Doar Save** scrie ceva (temporar sau definitiv). Deci NU există buton „revert" separat: Cancel = discard.
  La închidere cu modificări nesalvate → modal în mijloc (Faza 3): „Salvează / Renunță / Rămâi aici" (Renunță = discard).

---

## 1. De ce există (problema reală a lui David)

- Melodiile sunt făcute de **musical directors**; liderii doar le importă în Order (aleg aranjament gata făcut).
- **P1. Melodii vechi/outdated** — prea multe ca să le reparăm manual → nevoie de **replace definitiv**.
- **P2. Melodii prea lungi** — vrem doar jumătate → **alterare de secvență temporară**.
- **P3. Mashup/colaj** — vreau doar bridge-ul din melodia X peste melodia Y, sau bridge-urile din 3 melodii.
  Azi trebuie să pui 3 melodii în Order și să explici cu text — **aiurea, fără logică**. Vrem o **mutație reală**
  care apare ca **o singură melodie** în Order.

Dinamica dorită: **temporară** (idei creative / combinații) SAU **definitivă** (melodii outdated).

---

## 2. Terminologie (ca să vorbim la fel)

- **Editor (Mashup Studio)** — ecranul nou de editare, deschis din Order (icon ✎ lângă paperclip).
- **Bloc / Secțiune** — unitatea de editare = un bloc ChordPro (`Verse 1`, `Chorus`, `Bridge` + corpul lui).
  Derivat din `chordpro`-ul melodiei prin motorul existent (`lib/songs/chordpro.js`).
- **Snapshot** — starea completă, self-contained, a melodiei editate (vezi §4). Nu depinde de original după creare.
- **Transition next song** (buton jos) — aduce TOT din melodia următoare și o unește → mashup.
- **Mashup** — snapshot cu blocuri din ≥2 melodii-sursă. În Order apare ca **o singură melodie**.
- **Save modes** — `TEMPORAR` / `REPLACE` / `SAVE AS NEW` (→ `melodie nouă` | `aranjament nou`).

---

## 3. Ce reutilizăm (NU reinventăm)

| Nevoie | Există deja | Fișier |
|---|---|---|
| Parse/transpose/randare acorduri | `renderChordPro`, `convertBrackets`, `semitoneDelta` | `lib/songs/chordpro.js` |
| Secvență derivată din chart | `sequenceFromChordpro` | `lib/songs/chordpro.js` |
| Editor ChordPro „ca la Beni" | `ChordProEditor`, pagina `app/chords/[id]/[aid]` | `components/songs/ChordProEditor.jsx` |
| Chart combinat (medley) | `CombinedChartView` (derivat, fără storage) | `components/plans/order/CombinedChartView.jsx` |
| Medley de bază | `MedleyEditor` + `type:"medley"` + `medley[]` | `MedleyEditor.jsx`, `PcPlanItem.medley` |
| Secvență one-time pe plan | `PcPlanItem.sequence` (gol = moștenește) | `models/PcPlanItem.js` |
| CRUD songs/arr/keys/files | create/patch/delete + `PUT chordchart` | `routes/songs.js` |
| Copiere resurse fără re-upload | fișierele au `url` (Cloudinary) → copiem referința | `PcSongFile.url` |
| AI registry (context+acțiuni) | `useAiSurface`, `registry.js`, `AiProvider` | `lib/ai/*` |
| AI gateway server | `aiService.run` (Anthropic, Haiku default) | `services/aiService.js`, `routes/ai.js` |
| PDF/preview producție | `buildProductionHtml` (deja respectă 1 header, game) | `plans/[id]/page.jsx` |

**Concluzie:** ~70% din „motor" există. Munca = (a) structura de snapshot editabil, (b) editorul vizual,
(c) cele 3 salvări, (d) upgrade AI gateway la **tool-use / proposedActions** + reguli + antrenare, (e) randarea
mashup-ului în Order/Rehearse/Preview.

---

## 4. ARHITECTURA DATELOR (cel mai critic — citește de 2 ori)

### 4.1 Principiul de izolare
- **TEMPORAR nu scrie NICIODATĂ** în `pc_songs/pc_arrangements/pc_keys/pc_songFiles`. Punct.
- Editarea pornește de la o **copie în memorie** (snapshot) a datelor sursă. După ce ai snapshot-ul, editezi snapshot-ul.
- Salvarea alege DOAR atunci unde ateriza: item (temporar) sau DB (replace / new).

### 4.2 Structura `SongSnapshot` (self-contained)
```jsonc
{
  "title": "Nimic nu sunt (ediție scurtă)",   // titlu afișat
  "bpm": 68, "meter": "4/4", "lengthSec": 0,
  "keys": [                                     // 1..n game (mashup poate avea mai multe)
    { "label": "A", "startKey": "A", "sourceIdx": 0 },
    { "label": "B", "startKey": "B", "sourceIdx": 1 }
  ],
  "blocks": [                                   // unitatea de editare (drag/delete/edit/add)
    {
      "id": "b1",
      "label": "Bridge 1",                      // eticheta secțiunii (editabilă)
      "chordpro": "[A]Versuri...\n...",         // corpul ChordPro al blocului (editabil)
      "sourceIdx": 0,                            // din ce melodie-sursă vine (index în `sources`)
      "custom": false                            // true = scris de la zero de user/AI
    }
  ],
  "sequence": ["B1", "B2"],                     // derivat din blocks (sau custom), tokeni PCO
  "headers": [                                   // headere de mashup inserate manual (vezi §6.4)
    { "id":"h1", "title":"Următoarea melodie", "bpm":72, "meter":"6/8", "afterBlockId":"b3" }
  ],
  "sources": [                                   // melodiile-sursă (pt. copiere fișiere + save-as-new)
    { "songId":"...", "arrangementId":"...", "keyName":"A", "title":"Nimic nu sunt" }
  ]
}
```
- Blocurile = „single source of truth" pt. versuri/acorduri. `sequence` + `combined chordpro` se **derivă** din ele.
- `combined chordpro` (pt. preview/PDF/chart) = concatenarea `blocks[].chordpro`, fiecare transpus în gama lui
  (reuse `renderChordPro`/`convertBrackets`). Zero storage nou la temporar.

### 4.3 Unde trăiește TEMPORAR  ✅ (decis: D1 — colecție izolată `pc_tempSongs`)
**Colecție NOUĂ `pc_tempSongs`, complet separată de `pc_songs` (nu apare NICIODATĂ în biblioteca Songs):**
```js
// pc_tempSongs (nou) — „clona" temporară, self-contained, trăiește DOAR în Order
{
  orgId, planId, itemId,          // context (de care plan/item ține)
  kind: { enum: ["single","mashup"] },
  snapshot: { /* SongSnapshot din §4.2 — titlu, keys, blocks, sequence, headers, sources */ },
  sourceItemIds: [ObjectId],      // la mashup: itemii originali care au fost „consumați"
  createdBy, createdAt, savedAt,
}
// PcPlanItem (aditiv): itemul pointează la clona temporară
tempSongId: { type: ObjectId, ref: "PcTempSong", default: null }
```
- **Semantica cerută (D1):** editezi 1 melodie SAU faci mashup → se **clonează** aici ca „melodie temporară nouă".
  La **mashup**, itemii originali **dispar din Order** (`sourceItemIds`), iar un item nou primește `tempSongId`.
  La **single-edit**, itemul curent primește `tempSongId` (melodia originală rămâne legată doar informativ prin `sources`).
- **Izolare totală:** `pc_tempSongs` ≠ `pc_songs`. Biblioteca Songs nu le vede, căutarea Songs nu le întoarce.
- **Buton global „Curăță melodiile temporare":** `DELETE /temp-songs` (sau purge orfani). Șterge toate clonele.
  Volum mic (~10–15 / 1–2 ani) → simplu, fără griji de scalare.
- Preview/Rehearse/Order: când itemul are `tempSongId`, randarea citește `tempSong.snapshot` în loc de song-ul normal.

### 4.4 Salvările — matrice completă

| Mod | Fără Transition | Cu Transition (mashup) |
|---|---|---|
| **1. TEMPORAR** | clonă în `pc_tempSongs` (kind single), itemul primește `tempSongId`. Nu atinge DB song. Nume nou OPȚIONAL. Ștergi = ștergi clona, repui melodia (sau butonul global „Curăță"). | la fel, dar cele 2 melodii din Order → **dispar** (`sourceItemIds`), apare 1 clonă (kind mashup). Nume nou **OBLIGATORIU**. Game: 1 dacă egale, altfel „A / B" (space-slash-space). Fișiere: containere separate per sursă (vezi §6.5). |
| **2. REPLACE & SAVE** | scrie DEFINITIV în `pc_arrangements.sequence` + master `chordpro` (PUT chordchart). **Validare: scrii titlul** melodiei ca să confirmi (+ buton „copy" la titlu). Nume nou OPȚIONAL (e același song). Ireversibil. | **INTERZIS.** Odată apăsat „Transition next song", butonul Replace **dispare** din UI. |
| **3. SAVE AS NEW → melodie nouă** | `pc_songs` + `pc_arrangements` + `pc_keys` + `pc_songFiles` noi; COPIAZĂ perfect originalul (mp3/linkuri/arr) dar cu `sequence`+`chordpro` noi. Nume = `"<titlu NOU> N"` (N incrementat). Standalone. | identic; dacă e mashup, melodia nouă conține blocurile combinate; fișierele = unite din surse. |
| **3. SAVE AS NEW → aranjament nou** | `pc_arrangements` nou SUB song-ul existent (copiază din cel vechi + mp3/linkuri), alt `sequence`/`chordpro`. Titlu OBLIGATORIU `"<titlu NOU> N"`. | **bifezi** care melodie-sursă primește aranjamentul nou (ti le pune pe toate în față). Fiecare bifată primește o dublură de aranjament cu chords/lyrics diferite. |

Note:
- „N" (cifra) = count existent de melodii/aranjamente cu același prefix nume + 1. Backend calculează, atomic.
- Copierea fișierelor = **referință la același `url`** (fără re-upload — storage-ul e la 24% dar limitat). Vezi §12 Q4.
- Toate ștergerile DB = soft (`deletedAt`), ca în `songs.js`.

### 4.5 Modele atinse (toate ADITIV)
- `PcTempSong` (**nou**): clona temporară izolată (vezi §4.3). NU în biblioteca Songs.
- `PcPlanItem`: + `tempSongId` (ref PcTempSong, default null). (+ eventual `keysLabel` derivat pt. afișare „A / B".)
- `PcTransitionPreset` (**nou**, mic): preset-uri de tranziție salvabile (§12 Q7). `{ ownerId?, orgId, label, kind, note, sortOrder }`.
- `PcAiLesson` (**nou**, mic): memoria de antrenare AI (§5.4). `{ orgId, surface, command, verdict, note, exampleContext, createdBy, createdAt }`.
- `PcAiRule` — NU în DB; regulile de bază stau ca **JSON versionat în repo** (vezi §5.3). Doar „lecțiile" învățate sunt în DB.

---

## 5. AI-FIRST (pilonul 1)

### 5.1 Ce vede AI-ul (context surface)
Editorul înregistrează o suprafață `order.songEditor` cu `getContext()` care întoarce **tot**:
```js
{ title, bpm, meter, keys, sources:[{title,keyName,sequence}],
  blocks:[{id,label,chordpro,sourceIdx,custom}], sequence, headers, selectionBlockId }
```
→ AI-ul citește toate blocurile + toate melodiile aduse (inclusiv prin Transition), fără `@`.
`@mention` = doar o referință comodă (selectezi o melodie/bloc), dar nu e obligatoriu.

### 5.2 Ce poate face AI-ul (action catalog — ~100 comenzi, validate)
Fiecare acțiune = funcție din editor, validată, prin aceeași cale ca un click. Exemple (grupe):
- **Secvență:** `keepOnly(parts)`, `removeSection(id|label)`, `duplicate(id)`, `reorder(fromId,toId)`,
  `trimToHalf()`, `keepBridgesOnly()`, `moveSection(id, dir)`.
- **Conținut:** `editLyrics(id, instruction)` (reuse `transform-lyrics`), `addSection(label, text?)`,
  `renameSection(id, label)`, `rewriteChords(id, instruction)`, `transposeBlock(id, key)`.
- **Mashup:** `bringNextSong(transitionType)`, `insertHeader(afterId, {title,bpm,meter})`,
  `pickKeys([...])`, `mergeKeysLabel()`.
- **Salvare (propune, NU execută fără confirm):** `prepareSaveTemporary`, `prepareReplace`, `prepareSaveAsNew`.
> Catalogul complet (~100) se scrie ca listă în `lib/ai/commands/orderEditor.commands.json` (versionat).

### 5.3 Regulile (~150) — JSON versionat în repo
`lib/ai/rules/orderEditor.rules.json` — reguli „foolproof" pe care gateway-ul le injectează în system prompt:
- Ce e un bloc, ce e sequence, convenția tokenilor (V1, C1, B1, Pre, Inst…), cum se face bis, ce NU atinge
  (nu schimbă acordurile în `[ ]` dacă nu i se cere, păstrează indentarea), ce înseamnă „jumătate", „doar bridge-urile",
  reguli de mashup (1 singur header, game A/B), limbaj RO, etc.
- Format: `{ id, when, rule, example_in, example_out }` → AI face DOAR legătura, nu gândește de la zero.

### 5.4 Antrenarea (👍/👎 → memorie)
- După fiecare acțiune propusă/aplicată, un rând cu 👍/👎 + notă opțională.
- 👎 (sau 👍 cu notă) → `PcAiLesson` (per org). La următorul prompt, gateway-ul adaugă top-K lecții relevante
  („uite, vezi că faci bine când…, nu faci bine când…"). Așa „îl trăinuim" fără fine-tuning.
- UI: panou mic „Ce a învățat AI-ul aici" (listă lecții, editabile/ștergibile de admin).

### 5.5 Gateway — upgrade necesar (server)
Azi `aiService.run` întoarce doar text. Trebuie extins la **tool-use**:
- Input: `{ prompt, context (snapshot surfaces), actions (catalog), rules, lessons }`.
- Construiește `tools` din catalog (JSON schema per acțiune) → Claude întoarce `tool_use` → mapăm la
  `proposedActions:[{surfaceId,actionId,args,label}]` (contractul deja a_steptat în `client.js`!).
- Omul confirmă în UI → `runAction` execută fiecare. 100% human-in-the-loop.
- **Cost/model:** default Haiku (ieftin, deja setat). Comenzile grele de reasoning (mashup complex) pot cere
  Sonnet — vezi §12 Q3. Cheia = `ANTHROPIC_API_KEY` server (cheia lui David). Buget/limită opțional.

---

## 6. INTEGRARE Order / Rehearse / Preview

### 6.1 Intrare în editor
- Rând de melodie/medley în Order: lângă paperclip apare **icon ✎ (Phosphor `PencilSimpleLine`)**.
- Click ✎ → se deschide **Mashup Studio** (full-screen takeover — vezi §7). Și din `ItemDrawer` (buton „Editează în Studio").

### 6.2 În Order (listă) după salvare
- Melodie editată temporar: titlul (nou dacă există) + badge discret **„editat"** (Phosphor `PencilSimpleLine` mic, neutru).
- Mashup: 1 rând, titlu nou, game **„A / B"** (sau 1 dacă egale), badge **„mashup"** (reuse stil `mtag`, neutru).

### 6.3 Preview/PDF & Rehearse
- Snapshot-ul alimentează `buildProductionHtml`/Rehearse exact ca o melodie normală: `sequence`, `voices`, `keyName`.
- **1 singur header** afișat pt. tot mashup-ul (regula ta). Liderul poate șterge headerul dacă vrea.
- Game multiple → badge „A / B" pe același rând.
- Fișiere (foaia finală / resurse): container PDF-uri sus, apoi câte un container de resurse **per melodie-sursă**
  (mp3-uri + linkuri), în ordinea din editor (vezi §6.5).

### 6.4 Header dinamic de mashup (cerință specială)
- Pot **adăuga / șterge** un header oriunde. Default titlu „Următoarea melodie" (editabil). În dreapta: 2 dropdown-uri
  frumoase (BPM + meter).
- **Sequence-urile headerului se populează DINAMIC** din blocurile de sub el până la următorul header:
  mut headerul pe Y → secvența lui se recalculează (ex. deasupra la B1,B2 → „B1 B2"; dacă acoperă și C3+Inst → „C3 Inst B1 B2").
- **Drag live**: pe măsură ce mut (nu doar la drop), lucrurile se rearanjează sub deget. Fallback: butoane ↑/↓ + tastatură (WCAG 2.2 AA).

### 6.5 Containere de resurse la mashup (foaia finală)
```
[ Container PDF-uri (toate charturile noului mashup) ]
[ Container: „Resurse — <Melodia 1>" : mp3-uri + linkuri ]
[ Container: „Resurse — <Melodia 2>" : mp3-uri + linkuri ]
[ ...câte o melodie, atâtea containere ]
```

---

## 7. DESIGN / UX (pilonul 2) — Mashup Studio

> **Principiu-cheie (D2):** userii sunt **lideri non-muzicieni**. Partea stângă arată **~99% ca preview-ul curat**
> (versuri normale, familiare), **NU** ca `Lyrics & Chords` tehnic — fără `[C]` în paranteze „urât", fără game/jargon vizibil.
> Ei înțeleg: **drag & drop**, **modificare scrisă**, **adăugare element**, **selectare + schimbare cu AI**, **prompt AI**.
> Acordurile/transpunerea există „sub capotă" (motorul chordpro), dar vizual e curat ca foaia finală.

- **Format:** full-screen takeover. Layout 2 coloane:
  - **Stânga (editor = preview live, curat):** blocurile (secțiuni) exact ca pe foaia finală, drag-reorder **live**,
    edit inline al versurilor (clean, ca text normal), ✎ pe bloc, ✕ șterge, **„+ Adaugă element"**
    (autocomplete „ver…" → secțiuni găsite în editor, drag-in — reutilizăm autocomplete-ul din Songs),
    jos buton **„Transition next song"** (întâi alegi tipul de tranziție; presetate + custom salvabil).
    **Undo (Ctrl+Z)** + Redo (Ctrl+Shift+Z) pe toate operațiile.
  - **Dreapta (AI, dialog):** **chat cu AI** (label „AI Assistant", motorul Claude) — dialog normal ȘI execuție:
    scrii ce vrei schimbat, AI-ul analizează **TOT** (toate blocurile/melodiile) și **face** schimbarea,
    ținând cont de structură/sequence/aranjamente. `@mention` opțional. Deasupra: titlu, game (discret), BPM/meter, lungime.
- **Feedback la SALVARE (D3):** modalul de feedback/rezumat al schimbărilor apare **la „Închide & salvează"**,
  **în mijloc**, **NU** imediat după fiecare modificare — ca liderul să vadă ce s-a schimbat și să **continue** sau **să revină**.
  (Modificările AI se aplică live în editor, dar confirmarea „oficială" + 👍/👎 e la save.)
- **Save bar** (jos, lipită): `Salvează temporar` · `Replace & Save` (dispare la mashup) · `Save as new ▾`.
  Fiecare deschide modalul lui (cu validările din §4.4). Replace = **type-to-confirm** + copy la titlu.
- **Iconuri (Phosphor):** `PencilSimpleLine` (edit), `ArrowsDownUp` (reorder), `Trash` (șterge), `Plus` (adaugă),
  `MagicWand`/`Sparkle` (AI), `ArrowBendDownRight` (transition), `FloppyDisk` (save), `Copy` (copy titlu).
- **Reguli de stil:** tokens din `globals.css`; **FĂRĂ bare colorate**; separare prin containere + spacing + hairline neutru;
  animații fine (drag ghost, insert line, fade la modale); stări loading/empty/error; light & dark; responsive.
- Validare: **UI/UX Pro Max** la fiecare ecran, **21st** pentru referințe de editor/drag/command-bar înainte de a construi.

---

## 8. BACKEND — rute noi (toate aditive, reutilizează helperi din `songs.js`)

- `POST  /plans/:id/items/:itemId/temp-song` — creează/actualizează clona în `pc_tempSongs` + setează `item.tempSongId` (TEMPORAR).
- `DELETE /temp-songs` — **„Curăță melodiile temporare"** (purge tot/orfani). `DELETE /plans/:id/items/:itemId/temp-song` — scoate 1.
- `POST  /plans/:id/items/:itemId/replace-arrangement` — scrie în arrangement (sequence + chordchart). Cere `confirmTitle`.
- `POST  /plans/:id/items/:itemId/save-as-new` — body `{ mode:"song"|"arrangement", title, targets?[] }`.
- `POST  /songs/combined-chordpro` (helper, opțional) — asamblează combined chordpro din snapshot (sau pur client).
- `GET/POST/DELETE /transition-presets` — preset-uri de tranziție.
- `POST /ai/run` — extins cu tool-use (vezi §5.5). `POST /ai/lesson` — salvează 👍/👎. `GET /ai/lessons`.
- **Reminder:** backend `server/` NU e hot-reload → `node index.js` restart după fiecare schimbare.

---

## 9. FAZARE (step by step — NU sărim, NU „later")

> Fiecare fază: livrabile clare + verificare (David testează; eu nu testez în browser decât log-uri de compilare).

- **Faza 0 — Fundații & snapshot (DB + motor):** schema `songEdit` (aditiv), funcții `snapshotFromItem()`,
  `blocksFromChordpro()`, `combinedChordpro()`, `sequenceFromBlocks()`. Zero UI. Verificare: unit mental + compile.
- **Faza 1 — Mashup Studio read-only:** deschide editorul din ✎, afișează blocurile (preview live) din melodia curentă.
  Fără editare încă. Design complet (UI/UX Pro Max + 21st). Verificare vizuală.
- **Faza 2 — Editare blocuri:** drag-reorder live, delete, edit inline versuri/acorduri, add section + autocomplete.
  Verificare: editezi o melodie, se reflectă în preview.
- **Faza 3 — Salvare TEMPORAR (single):** save bar + modal; scrie `item.songEdit`; Order/Rehearse/Preview citesc snapshot.
  Verificare: PDF-ul săptămânii reflectă editul; originalul neatins.
- **Faza 4 — Transition next song (mashup):** buton + picker tip tranziție (+ presets), aduce melodia următoare,
  unește blocuri, header dinamic cu sequence populat pe Y, game „A / B", containere resurse. Temporar-only.
- **Faza 5 — REPLACE & SAVE (single):** type-to-confirm + copy; scrie în arrangement (sequence + chordpro). Ireversibil.
- **Faza 6 — SAVE AS NEW (melodie / aranjament, + bife mashup):** creează în DB, copiază resurse (referință url), naming „N".
- **Faza 7 — AI gateway tool-use + catalog + reguli:** upgrade `aiService` la proposedActions; catalog+rules JSON;
  surface editor; panou acțiuni propuse + Aplică.
- **Faza 8 — AI antrenare (👍/👎 → lecții) + @mention + read-all polish.**
- **Faza 9 — Lustruire design (animații, stări, responsive, dark), QA complet, memorii.**

(Ordinea 7→8 poate fi mutată mai devreme dacă vrei AI din Faza 2 — vezi §12 Q6.)

---

## 10. Reguli de siguranță (hard)

- Temporar **niciodată** nu scrie în `pc_songs/arrangements/keys/songFiles`.
- Replace & Save as new = **doar** cu `requireCan("songs.edit")` + confirmare explicită.
- Copiere fișiere = referință `url` (nu re-upload), ca să nu umflăm storage-ul (sau independent — Q4).
- Ștergeri DB = soft (`deletedAt`).
- AI nu execută nimic fără confirm uman (proposedActions → Aplică).
- MongoDB = READ-only fără ordin scris explicit în chat (regula ta de aur).

---

## 11. Riscuri & mitigări

- **R1 „Temporarul scapă în bibliotecă"** → izolare pe item, zero scriere în songs (§4.1).
- **R2 Resurse partajate se strică la ștergerea originalului** (save-as-new prin referință) → Q4 (referință vs copie independentă).
- **R3 Mashup chordpro cu game diferite** → fiecare bloc transpus în gama lui la randare (motor existent).
- **R4 Cost AI** → Haiku default; Sonnet doar pe comenzi grele; buget opțional.
- **R5 Drag live performanță** → virtualizare dacă e nevoie; dar listele de blocuri sunt mici (zeci).
- **R6 Backend fără hot-reload** → checklist restart în fiecare fază de backend.

---

## 12. ÎNTREBĂRI pentru David (decizii care schimbă planul)

> Cele marcate ⭐ sunt cele care schimbă ARHITECTURA — le întreb și interactiv.

- ✅ **Q1 — RĂSPUNS:** colecție izolată `pc_tempSongs` + buton „Curăță melodiile temporare" (D1).
- ✅ **Q2 — RĂSPUNS:** full-screen, stânga = preview curat leader-friendly, undo, dialog AI (D2/D3).
- ✅ **Q3 — RĂSPUNS:** Haiku + Sonnet la nevoie (D4). (buget: nestabilit — vezi Q13 dacă vrei limită.)
- ✅ **Q4 — RĂSPUNS:** referință la același `url` (D5).
- **Q5 (ordinea AI):** vrei AI-ul din Faza 2 (devreme) sau după mecanica de bază (Faza 7)?
- **Q6 (antrenare):** lecțiile 👍/👎 sunt **per-org** (toți văd aceeași memorie) sau per-user? Cine le poate edita/șterge?
- **Q7 (preseturi tranziție):** salvate **per-user** sau **per-org**? Exemple default pe care le vrei din start?
- **Q8 (naming „N"):** „Melodie X NOU 1/2…" — OK formatul exact? Vrei separator („— v2"), sau fix „NOU N"?
- **Q9 (cine poate edita în Studio):** doar `songs.edit`? sau și liderii cu `editOrder` (dar fără Replace/Save-as-new)?
- **Q10 (autocomplete „ver…"):** doar secțiuni din editorul curent, sau și sugestii din biblioteca întregului song?
- **Q11 (Words/Lyrics la mashup):** regenerăm automat Words (public) din blocurile combinate? (reuse `buildWords`).
- **Q12 (ștergere edit temporar):** confirmi că „o dată salvat, ca să revii trebuie să ștergi editul și să repui melodia"?

---

## 13. Fișiere care se vor atinge (hartă)

- **Backend:** `models/PcPlanItem.js` (+songEdit), `models/PcTransitionPreset.js` (nou), `models/PcAiLesson.js` (nou),
  `routes/plans.js` (song-edit endpoints), `routes/songs.js` (reuse save-as-new helpers), `routes/ai.js` + `services/aiService.js` (tool-use),
  `routes/transitionPresets.js` (nou).
- **Web:** `components/plans/order/OrderTab.jsx` (icon ✎), `ItemDrawer.jsx` (buton Studio),
  `components/plans/order/MashupStudio/*` (nou: editor, BlockList, BlockEditor, AddSectionMenu, TransitionPicker,
  SaveBar, SaveModals, AiPanel, HeaderBlock), `lib/songs/snapshot.js` (nou), `lib/ai/commands/*.json`, `lib/ai/rules/*.json`,
  `lib/ai/*` (extensii), `plans/[id]/page.jsx` (preview mashup: 1 header, game A/B, containere resurse).
- **Reguli/Docs:** acest fișier + memorii.

---

*Următorul pas: răspunzi la întrebările ⭐ (Q1–Q4) + la cele care-ți pasă din Q5–Q12; eu finalizez planul și
începem Faza 0. Nimic nu se implementează până nu zici „start".*
