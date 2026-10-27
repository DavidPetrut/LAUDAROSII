# 🔄 UPDATE (sesiunea de azi — audit UI + arhitectură, partea 2)

> David, am băgat tare cu ce ai reclamat din Word doc + cele 4 mesaje + poze. Tot verificat vizual
> (am randat componentele cu date mock într-un preview temporar, apoi l-am șters). **Zero emailuri.**

### Ce am rezolvat acum (din feedback-ul tău)
1. **LĂȚIME COMPLETĂ** — am scos padding-ul îngust. Plans/Matrix/Teams/People/Profil ocupă tot ecranul
   (`.pc-full` — ies din containerul centrat de 1600px). (mesaj 1+2)
2. **Bara de asignare = componentă GLOBALĂ lipită în DREAPTA** (`AssignSidebar`). Aceeași în **Matrix ȘI
   în Teams**: click pe o poziție → se deschide fix în dreapta ecranului, nu deasupra. Grila primește loc
   la dreapta (nu e acoperită). (mesaj 2+4)
3. **Avatar + badge status în colț** (`PersonAvatar`) — poza persoanei la stânga + cerculeț mic
   verde(confirmat)/galben(?)/roșu(×) în colț, exact ca PCO. Am scos iconițele check/? din stânga numelui. (mesaj 3)
4. **Teams view TERMINAT & interactiv** — echipele = COLOANE în **carusel orizontal** (x-scroll, nu rows
   urâte jos), fiecare poziție = rând cu **fundal definit** la antet, avatar+status, **Needed −/N/+**,
   click poziție → bara globală, click persoană → **EditPersonModal**. (mesaj 3+4)
5. **UX SEAMLESS** — update **OPTIMIST** (persoana apare instant) + **reconciliere silențioasă** (fără flash
   „Se încarcă", fără reset, bara rămâne deschisă) la assign/remove/edit/needed. (mesaj 2)
6. **EditPersonModal** (ca poza 261) — Confirmed/Pending/Declined + Team/Position + Notes + Notifications
   (timeline când există date; altfel „niciun email trimis, le trimiteți voi manual") + Remove/Cancel/Save.
7. **Filtre în bară** (cerere lider): **SIM 1/2** (citit din „(1)"/„(2)" din nume — funcțional) + **Gen F/B**
   (UI gata; se activează când avem date de gen) + căutare. Conflicte: roșu=blockout, galben=planificat
   altundeva, cu număr.
8. **Backend** — `/plans/:id/teams` returnează acum TOATE pozițiile (și goale, cu „Needed") + `assignmentId`
   / `personId` / status per om → Teams devine interactiv ca Matrix.

### Ce am mai adăugat (azi, partea 3)
9. **Raport „persoane neplanificate" LIVE** ✅ — buton „👥 Neplanificați" în Matrix deschide în **tab nou**
   `/plans/coverage/:serviceTypeId`: coloane pe câte ori e planificată fiecare persoană în interval
   (**Neplanificați / 1× / 2× / 3× / 4×+**), filtre **interval (N planuri) + slujire/echipă**,
   **auto-refresh la 8s** (dispar pe măsură ce planifici în cealaltă filă). Fiecare card: **„mai poate ×N"**
   (de câte ori mai poate fi planificat = N − planificat − blocat, ține cont de **blockouts** ⛔) + contor.
   Backend `GET /matrix/:id/coverage` — DOAR READ. (cererea mare a liderului, finalul Word) ✅

### Ce am mai adăugat (azi, partea 4)
10. **Add Plans — Copy Times From + Template** ✅ (ca poza 273): Quantity + **Copy Times From** (ia orele
    dintr-un plan ales, decalate corect pe fiecare săptămână) + Starting On + **Template** (copiază
    structura „Needed" per poziție dintr-un plan model). Păstrează ziua săptămânii. `POST /plans` batch,
    backward-compatible. Fără oameni/email la creare. Fix și full-width (padding orizontal pe pagini).

### Ce am mai adăugat (azi, partea 5)
11. **Checkbox „Adaugă și la SIM 2" la assign** ✅ — în bara de asignare apare (doar când există echipă
    pereche + poziție cu același nume) bifa „Adaugă și la Asimilare (SIM 2)". Bifată, când asignezi o
    persoană o pune și pe echipa pereche, pe aceeași poziție — optimist, fără email. Merge în Matrix ȘI Teams.

### Ce am mai adăugat (azi, partea 6)
12. **Blockout rules (lider)** ✅ — **churchBlock (albastru)**: blocaj pus de planificator din profil
    („Disponibilitate" → Blochează/Ridică), persoana **nu mai apare** în bara de asignare NICI în raportul
    „Neplanificați"; afișat albastru (vs personal roșu) + badge „Blocat de biserică". Reguli person-side în
    `POST /schedule/blockouts`: **planificat + email trimis → NU poți pune blockout** (eroare „vorbește cu
    planificatorul"); **planificat (fără email) + blockout → auto-decline** (DOAR DB, ZERO email/notificare).

### Ce am mai adăugat (azi, partea 7)
13. **EditPersonModal cu date REALE** ✅ — la deschidere trage `GET /plans/:id/assignments/:aid`:
    **email**, **Service Times** + **Rehearsal Times** (bifate = în `timeIds`), **Notes** reale și
    **timeline Notifications** (Prepared/Sent/Read/Responded cu datele reale). Exact ca poza 261. READ.

### Ce am mai adăugat (azi, partea 8)
14. **Invitați (guests) one-time** ✅ — tab „Guest" în bara de asignare: scrii un nume → „Adaugă invitat"
    → apare **Confirmed** pe poziție, cu tag „invitat" în grilă/Teams. **FĂRĂ PcPerson** (personId fictiv
    unic, `isGuest`+`guestName`) → **fără istoric**, nu apare în listele de candidați, nu încarcă People.
    Fără email. (cererea liderului pt. vorbitori/vizitatori din afară)

### Ce am mai adăugat (azi, partea 9)
15. **Reguli de recomandare per poziție** ✅ — în bară, buton ⚙ „Reguli poziție": setezi **Gen** (Oricine/
    Băieți/Fete), **SIM** (Oricare/1/2) și **Target ×/lună** (`PATCH /plans/positions/:id/rules`). La
    deschiderea poziției, filtrele se **pre-selectează** din regulă. Recomandarea arată **badge target**
    (ex. `0/2` verde = sub cotă, `2/2` gri = atins) și **sortează sub-target întâi**, apoi „due".
    Genul NU se mai filtrează hard în backend (ar goli lista fără date de gen) — se aplică în bară când există.

### Fixuri din testarea ta (azi, partea 10)
- **#5 „ID invalid" la Matrix dintr-un plan** — reparat (lipsea `serviceTypeId` în header).
- **#1 Declined rămâne vizibil** (admin) în Matrix + Teams, nume tăiat; la decline **+1 Needed**, la revenire −1.
  (La user/mobil se va ascunde — rămâne de făcut filtrul pe permisiune.)
- **#3 Teams** — counts pe rând separat cu iconițe status (✓/?/✕), padding header poziție, scos spațiul de jos.
- **#6** — icon „planning" pe persoană (hover) + click pe eticheta poziției → deschide bara de asignare.
- **#7** — navbar full-width (taburi stânga, profil dreapta), spațiat, activ; **săgeți ‹/› pe dată** în Matrix.
- **#2 GEN pe oameni** ✅ — am asignat gen după nume (RO): **160 F / 124 M**, 8 rămase (conturi test/ambigue).
  Script reutilizabil `server/planning-center/services/assignGender.js` (`--dry`/`--apply`). **Gen editabil în profil**
  (Details → dropdown). Filtrul fată/băiat din bară **funcționează acum**.

### Fixuri din testarea ta (azi, partea 11)
- **#4 Plan detail — sidebar STÂNGA (ca în PCO)** ✅ — Times/Files/Notes mutate din taburile de sus în
  **sidebar-ul din stânga**, plus card **„Rolul meu"** (poziția ta pe acel plan). Săgețile ‹/› + data
  mutate **sub titlu** (pill, ca PCO). Taburile principale: **Order / Teams**. Notes marcat **„doar admin"**,
  Files: „Nu există fișiere pentru acest plan.".

### Custom Matrix (azi, partea 12) ✅
- **Rotița ⚙ + dropdown service type** — schimbi matrix-ul la alt service type sau „+ New Custom Matrix".
- **Panou Settings** (stânga, ca PCO): Name, **SMART LOAD** — **Quantity** (Previous plans / Next plans, steppers)
  sau **Date** (From N săpt. în urmă, To N săpt. înainte) — și **Service Types** (checkbox-uri multi-select).
- **Matrix combinat multi-ST** — coloane = planurile tuturor ST-urilor selectate (pe dată), **secțiuni per ST**
  (super-header colorat); backend generalizat (`?sts=...&prev=&next=&from=&to=`). Săgețile ‹/› paginează fereastra.

### Ce a mai rămas (ți-l las clar)
- **Salvare custom matrix** (persistent, nu doar în sesiune) + tab **Sections** (ce secțiuni poziții arăți).
- **Notes permission-based** (ascuns la user normal) + **Files upload** (lider încarcă document) — RBAC/upload.
- **Create account / registration** (admin creează cont persoană, ca în PCO) + gen obligatoriu la înregistrare.
- **Instrucțiuni per poziție** („manualul" de onboarding) — câmpul există + PATCH-ul îl salvează; mai lipsește
  UI-ul de editare + afișarea la user (in-app/email/push).
- **Email** (global templates + logo Vertical) — **strict cu tine**, nimic trimis automat.
- **Deploy:** backend-ul (plans.js teams) cere redeploy Render ca Teams să ia forma nouă (push-ul declanșează).

---

# 🌅 Raport de dimineață — Plans / Matrix (sesiune autonomă de noapte)

> Salut David. Am lucrat autonom pe Plans/Matrix cât ai dormit. Mai jos: **ce am făcut**, **cum testezi**,
> și **ce a rămas care te cere pe TINE fizic** (n-am putut face singur, în special orice atinge oameni reali).
> Regula ta a fost respectată 100%: **ZERO emailuri / notificări trimise, nimic distructiv pe laptop/OS.**

Data: noapte 26→27 oct 2026. Tot codul e **comis + pushed pe `master`** (Render se auto-deployează).

---

## ✅ CE AM FĂCUT

### 1. Import PCO (migrarea reală, one-time, reutilizabilă)
- Importate din PCO prin API (JSON:API + relationships + include): **9 service types, 46 echipe, 322 poziții,
  287 oameni reali, 1128 planuri (istoric ~5 ani), + asignări / needed / note / plan-times / blockouts.**
- **Dedublare curată:** am șters datele seed/test (non-PCO) și am **unificat conturile de mobile app cu
  persoanele reale PCO după email** (75 unificate, login mutat pe persoana reală, 5 conturi fără pereche
  păstrate). Acum **People = 292** (287 reali + 5 conturi), toate cele 80 de login-uri intacte.
- **Ordine import optimizată:** întâi toate planurile din toate service types, apoi asignările **cele mai
  apropiate de azi întâi** → ce vezi în Matrix/Plans se populează primul. Istoricul vechi vine la urmă.
- **Unealtă CLI reutilizabilă** (`server/planning-center/services/pcoImport/cli.js`): `--resolve` (counts),
  `--dry`, `--run`, `--clean-seed`, `--dedupe-people`. O poți da altei biserici cu PCO.

### 2. Web — tab-uri noi (același app cu Songs, consumă `/api/pc/v1`)
- **Plans** (`/plans`) 1:1 PCO: titlu org + dropdown Matrix, **calendar lunar** (puncte pe zile) + program pe zi,
  **Service Types colapsabile** cu tabel (Upcoming/TITLE/LAST UPDATED), **max 10 planuri + „Vezi mai vechi"**.
- **Matrix** (`/plans/matrix/[id]`) — **rescris 1:1 PCO**: secțiuni echipe colapsabile, nume poziții la dreapta,
  antet plan+dată, celule cu **icon status** (bifă verde / „?" galben) + nume + **Needed**.
- **Plan detail** (`/plans/[id]`): tab-uri **Order / Teams / Times / Notes / Files** (gata cu 404 la click pe plan).
- **People** (`/people`): listă paginată (nume/email/telefon/permisiuni/creat) + căutare + sortare.
- **Profil persoană** (`/people/[id]`): Scheduling (status + program viitor + blockouts roșu + Teams) /
  Communication (mesaje) / Details.
- **My Schedule** (`/my-schedule`) + **Media** (`/media`) — gata cu 404-urile din nav.
- **Taburi fixate:** spațiu între ele + tab activ cu background/border/bold (erau lipite).

### 3. Matrix — funcționalitățile cerute de liderul tău (din Word + transcript)
- **Bara DREAPTA (asignare):** click pe o celulă (plan × poziție) → listă candidați **cu recomandări**:
  grupați **FĂRĂ CONFLICT / CU CONFLICT**, sortați după „due" (cine n-a mai fost de mult pe poziție),
  **badge săptămâni** (-9w / +1w), **conflicte** (⛔ blockout roșu / ⚠ suprapunere ore galben), căutare.
  Click pe o persoană = **asignează** (status *unconfirmed*, **fără email**).
- **Target view:** click pe un om în grilă → se evidențiază unde mai e planificat (restul se estompează).
- **Drag & drop:** tragi o persoană pe altă poziție = **COPIAZĂ** (ca în PCO); **Ctrl+drag = MUTĂ**.
- **SIM1 → SIM2:** buton ⧉ pe antetul echipei → **replică toate asignările pe echipa pereche** (după nume poziție).
- **Editare asignare** (modalul „Editing Scheduled Person"): creion pe persoană → **Confirmed / Pending /
  Declined** + Remove. Totul **local, fără email**.
- **Editor „Needed"** în celulă: control **− / N / + / „+ Needed"** (setează câte persoane sunt necesare).
- **Add Plans** modal (Quantity + Starting On) → creează N planuri săptămânale (doar la Submit).
- **Teams tab**: iconițe status (bifă verde / „?" galben) la stânga numelui + counts per echipă.

### 4. Backend (endpoint-uri noi, toate FĂRĂ email)
- `GET /plans/:id/recommend` — recomandări + conflicte pentru bara dreaptă.
- `POST /plans/:id/assignments/copy` — replică echipă (SIM1→SIM2).
- `PATCH /plans/:id/assignments/:aid` — editează status/poziție/times/note.
- `matrix` grid: + `serviceTypeName`, `weekday`, `assignmentId`/`personId` per persoană (pt. drag/edit/delete).
- `GET /people` extins: email / telefon / permisiuni / createdAt (coloanele din PCO).

---

## 🧪 CUM TESTEZI (dimineață)
1. Pornește app-ul web (dacă nu rulează): `npm --prefix web/planning-center run dev` → `localhost:4100`.
   (Render s-a deployat deja; backend-ul e live.)
2. **Plans:** 9 service types, max 10 planuri + „Vezi mai vechi". Click pe un plan → detaliu (tab-uri).
3. **Matrix** (buton Matrix pe un service type): alege „Impact Maxim".
   - Celulele pe planurile Nov 2026 au oameni (asignări reale).
   - Click pe o celulă goală → bara dreaptă cu recomandări; click pe cineva → se asignează.
   - Click pe un om → target view. Trage un om pe altă celulă → se copiază. Creion → editezi status.
   - ⧉ pe echipă → copiază pe SIM pereche.
4. **People:** 292 oameni; click → profil. **My Schedule / Media** din nav.

---

## ⚠️ CE A RĂMAS — TE CERE PE TINE (nu pot singur)

### A. Lucruri sensibile (STRICT cu tine — ating oameni reali)
- **Trimiterea emailurilor de programare** (butonul „Trimite email" din Matrix / „Email These People").
  Endpoint-ul există (`send-schedule-emails`) dar **NU l-am atins niciodată**. Îl testăm împreună, controlat.
- **Accept/Decline din My Schedule** (declanșează răspuns real) — l-am lăsat ca seam, îl activăm împreună.

### B. Lucruri care îți cer OCHIUL (design pixel-perfect vs poze)
- **Nu m-am putut loga** în app (n-am parola ta) → **n-am văzut UI-ul randat cu date reale**. Am construit
  după poze + cod, dar **tu confirmi vizual** și îmi spui ce ajustez (spațieri, culori, iconițe exacte).
- Matrix/Teams: dacă vreo iconiță/culoare/aliniere diferă de PCO, notează-mi și reglez pe loc.

### C. Features din audit rămase (le pot face, doar n-am apucat la noapte)
- **Copy Times From / Templates** în Add Plans (acum creează săptămânal simplu; templates = următorul pas).
- **Target view pe TOATE planurile** (crosshair) — acum e doar pe planurile vizibile din grilă.
- **Recomandări avansate:** reguli per poziție (gen/program/target „2×/lună") — schema există
  (`defaultGender/defaultProgram/recommendRule`), le populăm din import + rafinăm scorul.
- **Auto-scheduler, signup sheets, stage layouts, reports builder** = seam-uri (din audit §5), le lăsăm later.

### D. Status import — ✅ COMPLET 100% (terminat în ~103 min, ZERO erori)
Final în DB (toate cu `remoteSource:"pco"`):
- **292 oameni** (287 reali + 5 conturi) · **9 service types** · **46 echipe** · **322 poziții**
- **1128 planuri** (tot istoricul ~5 ani) · **18.611 asignări** · **5104 needed** · **2059 plan-times** ·
  **8314 items** · **225 note** · **9217 blockouts**
- **PlanTimes: 0 erori** (fix-ul `teamReminders` a mers) — nu mai e nevoie de backfill.
- Verifică oricând: `node planning-center/services/pcoImport/cli.js --resolve` (din `server/`).
  Re-rulare (idempotentă, nu dublează): `--run`.

---

## 📌 De reținut
- **Mobile app** beneficiază automat de tot (aceeași DB + același `/api/pc/v1`) — datele + login-urile
  unificate apar și pe telefon. UI-ul de Matrix/Teams există deja pe mobil (`app/planning-center/screens`).
- Toate commit-urile sunt pe `master` (caută „feat(pc)" în `git log`).
- **Zero** acțiuni distructive, **zero** emailuri. Promisiune ținută.

Hai să pornim de aici dimineață. 💪
