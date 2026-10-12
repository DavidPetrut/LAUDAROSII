# Planning Center (modul „Servicii") — Arhitectură

> **Document VIU.** Arhitectură + **evidență de build**. Sursa de adevăr = documentația + screenshot-urile tale.
> **🏗️ BUILD ÎN CURS** (aprobat de user). Progresul strict = **§16 BUILD PROGRESS**.
> **UI = IDENTIC cu PCO** (screenshot-uri user). Un singur folder părinte: `app/planning-center/` + `server/planning-center/`.

---

## 0. Status
- **Versiune doc:** 0.29 · 🏗️ **BUILD: Faza 0 ✅ + Faza 1 People (backend ✅ + ecrane ✅, de testat pe device).** Progres strict = **§16**.
- **📁 CERINȚĂ HARD (user):** UN SINGUR folder părinte pe fiecare parte: `app/planning-center/` + `server/planning-center/`. Zero cod împrăștiat (§2).
- **🧱 PRE-BUILD HARDENING (§14):** răspuns la cele 5 cerințe mandatorii (AI peste tot / DB într-un loc / keep-drop / anti-hardcoding / ce trebuie știut).
- **✅ DECIZII DE FUNDAȚIE CONFIRMATE (§14.6):** **(A) Tenancy** = deployment-per-biserică + **seam `orgId`** din zi 1 (invariant §1.13). 🔓 Condiția userului: portița spre multi-tenant rămâne MEREU deschisă (nu „imposibil"). **(B) DB** = aceeași bază + prefix `pc_` (reuse frictionless cu prayer rooms/users). **(C)** = **NU MVP redus; facem TOT**, ordine de construcție fără throwaway (People→Services core→Calendar→restul), 100% garantat la final.
- **✅ KEEP/DROP (§14.3) — CONFIRMAT** de user (default-urile mele, nemodificate). La lansare: zero bani/licențe/externe plătite; toate externele = seam gol.
- **📱 SHELL „APP-IN-APP" (CONFIRMAT user):** build **mobile-only**, în interiorul app-ului existent. Tab-ul din footer **„Resurse" → redenumit „Planificare"**. La tap pe „Planificare": **footer-ul principal DISPARE** și e înlocuit de **bottom nav-ul Planning Center** (Schedule/Plans/Songs/Media/People). Experiență de „app înăuntrul app-ului". Vezi §2 + §7. **Implicație:** ce la PCO e „web-only" (creare media items, creare tag-uri) **trebuie să existe pe mobil** la noi (n-avem web). Vezi §9.
- **🎨 UI/UX = IDENTIC cu PCO Services** (scopul declarat). Construcția fiecărui ecran așteaptă **screenshot-urile tale** (sursa de adevăr vizuală).
- **📥 Rămas de absorbit în doc:** DOAR **Permisiuni Services complete** (Services LIVE + Reporting = amânate, NU la lansare).
- **📋 AȘTEPT de la tine:** screenshot-urile People (UI) + (când ai) docul „Permisiuni Services complete".
- **⚠️ FLAG CRITIC (MultiTracks) — CERCETAT 2026-10:** MultiTracks **NU are API public pt. terți** + ToS **interzice** re-upload de stems. Deci compatibilitatea MultiTracks = **parteneriat + licențiere, NU tehnică.** Căi: (A) acord formal cu MultiTracks; (B) coexistență (app-ul face tot, echipa folosește Playback separat). Nu putem promite „1000% compatibil" — depinde de MultiTracks. Vezi §11.6.
- **📥 CERINȚĂ HARD (user):** **import bulk de oameni din Excel/CSV** după un pattern clasic (extensibil). Template livrat: `people_import_template.csv`. Vezi §4.1 + §3 (#11).
- **🌍 CERINȚĂ HARD (user):** **România default**, dar **timezone ajustabil per filială** (avem filiale în alte țări). Multi-campus/multi-țară cu tz propriu → §1.9.
- **🤖 CERINȚĂ HARD (user):** **AI Layer GLOBAL din start** — arhitectura trebuie să permită FIZIC ca orice tab/funcționalitate să primească AI în viitor (prin prompt/input în app), fără rearhitecturare. „Să nu mă trezesc că nu pot." → §10.
- **🔌 CERINȚĂ HARD (user):** **API propriu** scalabil & bine gândit (seam) pentru integrări viitoare — nu-l expunem până n-avem ce, dar plumbing-ul există din start. → §11.
- **✉️ CERINȚĂ HARD (user):** **Email** — mandatoriu să putem trimite oricâte emailuri (chiar și soluție plătită). → §12.
- **SCOPE CONFIRMAT:** **Services** INCLUDE **People + Calendar** — 3 produse, un modul `pc_`.
- **Directivă user:** permisiuni/setări „pe care le uităm la UI" → **§9 NOTES UI** + inline.
- **Bucăți de documentație primite:**
  - `#1` — Overview + Search + Notificări + Image sizing
  - `#2` — Setup Services + Calendar/People + Transfer admin
  - `#3` — Roluri & permisiuni (model complet pe dimensiuni, folders, file access)
  - `#4` — Account settings (orgAdmin, church info/logo, localization + multi-campus/timezone)
  - `#5` — Security (login/2FA/sesiuni, scam/privacy mode, inactive≠delete), **Connect AI tools (MCP)**, **PCO API**, **Mailchimp/email** → generează §10/§11/§12/§13
  - `#6` — Toolbar (profile, help, notificări, to-do/tasks, chat) + Dashboards/widgets (per campus)
  - `#7` — **Calendar complet** (events/rooms/resources, approval groups, bookings & double-booking, multiple calendars, tags, event request forms, Month/Table/Week views, email notifications granulare, Connections, reporting Liquid)
  - `#8` — Calendar detaliat: **aprobare pe 2 niveluri** (event-level + room/resource), management approval groups, **tags** (grupuri required, culori, categorii Church Center), **filtre** (logică AND/OR), **recurență + excepții**, event templates, feeds (Groups/Reg), bulk edit, event tabs (Overview/Activity/Files/Connections/Settings), communication-request pattern
  - `#9` — Calendar final: hide/publish/delete, **multiple calendars + access control**, **require approvals per calendar** (+ tranziții la mutare), **resolve conflicts** (blockout-wins!), connections vs feeds, event templates, **sharing** (print/iCal/embed/kiosk/Church Center), vizibilitate (published/featured/link-only), reports
  - `#10` — **Event request forms** (form builder: field types + logică condițională + status Open/Closed/Archived) + **event request workflow** (apply rooms/resources „penciled-in" → 2 aprobări) + **Automations** (engine on-submit/on-approve → acțiune)
  - `#11` — **PEOPLE** (pilon): profil persoană ≠ cont login, households, **CSV import/export** (remote_id, preview, undo), **custom fields/tabs**, **lists** (segmentare), **workflows** (pipeline), **notes** (categorii+prayer), **duplicate detect/merge**, **directory**, membership, bulk actions, spam list, Overview/Config
  - `#12` — People detaliat: profile edit rules, **inactive vs delete** (cascadă cross-modul + GDPR partial-erasure), **merge** detaliat, **Activity** per persoană, **Forms** (3 categorii câmp: profile/workflow/basic, collaborators, notif list, spam, embed/QR), **Comunicare** (email senders/templates/scheduled/history, Mailchimp opțional, SMS consent, notificări digest/bundling), staff transition (ownership recovery)
  - `#13` — **Lists** detaliat: rules engine (all/any/none nested + include/exclude + at-least/exactly/at-most), **expansiune household**, auto-refresh, playlist mode, views (Unmanaged/Needs-attention/Starred), condition ownership, reports din listă (mailing labels seam)
  - `#14` — **🎯 SERVICES intro** (pilonul central, 5 roluri): scheduling (templates, needed positions, auto-schedule, **matrix**), preferences ≠ blockouts, team type (rehearsal/non-rehearsal), team leaders + replies-to, plan templates, files plan vs service-type, My Schedule (accept/decline/sign-up)
  - `#15` — **Services: Plan your service** (+UI): plan page (Order/Teams/Times/Notes/Files cu UI real), **time assignments conduc totul**, item leaders/colors/exclude-from-time, series+title, create/copy plan (quantity, templates per dată), echipe speciale (secure/split/tag/backup/guest), Collaborators (audit plan), attendance, share (public view/schedule-publish/worship-set/permalink), Master Calendar
  - `#16` — Order/Notes/Files/Items detaliat: **template unificat** (order+notes+teams+needed), **item leader dinamic** (poziție/persoană), **note categories** + **item row colors** + **time preferences** la nivel service-type, tipuri fișiere (stage layout/video/link), import=merge, delete/recover 30z
  - `#17` — **🗓️ Scheduling ADÂNC**: badge-uri conflict/blockout (4 tipuri, warnings-not-blocks), **auto-scheduler** (algoritm last-scheduled→blockout→prefs + undo), prepared notification, signup sheets, **replacement flow**, blockout requests, preferences detaliate (month/day/team/household), reschedule plans, rehearse tools (media player/songbook PDF/Music Stand+adnotări), volunteer pipeline
  - `#18` — **Comunicare cu echipa**: email de programare (UI din screenshot), reminder emails (7z/per-oră/**10am local**/condensate), chat, push (SMS=N/A), email templates (4 tipuri + personal/shared), „Replies To", prepared notification rafinat, părinți copiați pe email copil
  - `#19` — **Organize + Manage people**: **folder→campus→timezone**, limited file visibility (tag×poziție), tag teams dinamice, master calendar, service type archive/delete/restore, **archive vs remove** în Services, default permission settings, current folder, welcome email condiționat, filter/bulk-edit people
  - `#20` — **Team management**: 4 tipuri echipă detaliate (rehearsal/secure-BG/split/tag), scheduling gap alerts (**1pm campus tz**), rescheduling declines (5 opțiuni), access-for-scheduled-viewers, related teams, replies-to, merge teams, archive/delete team, auto-assign, automations pe team, take attendance, subscribe calendar (webcal/user)
  - `#21` — **Files & Media**: model unificat fișier (upload/link/YouTube-Vimeo/chord-chart/text-doc/stage-layout), **audio stream-only vs download**, **file tags auto-assign** + limited file visibility, **license tracking** (purchased/used/admin + Access Log), **copyright** (CCLI etc.), media items (container multi-file, auto-archive, thumbnail), storage mgmt, archive/delete/restore 30z
  - `#22` — **🎶 SONGS + TRANSPUNERE** (cireașa): Song→Arrangement→Key, **Lyrics&Chords editor (ChordPro)** → PDF auto în orice gamă + capo + number/numeral charts + coduri speciale, **transpunere audio DSP** (server-side, queue, quality caveat), sequences, song/arrangement tags, filter, integrări (SongSelect/PraiseCharts/MultiTracks), Top Songs
  - `#23` — **Integrări**: Check-Ins↔Services (attendance), **🎸 MultiTracks** (RehearsalPack/RehearsalMix-stems/ChartPro, seats, no-storage) — FLAG API terți, SongSelect (CCLI, activity-60d, copy-limit, ChordPro editable), PraiseCharts (per-profil, orchestration split)
  - `#24` — **📱 SERVICES MOBILE**: mobilul = **aceeași app, aceleași API-uri** (NU model separat) → confirmă §1.11 API-first + „two faces". **Offline/cache** (audio cached 30z după plan, clear manual) → rezolvă §8. **Skip-sync cross-device** (skip pe web = skip pe mobil) → `pc_mediaPlaybackState`. Media player mobil (List/Song/Lyrics/Docs/Notes, loop remembered, metronom, mini-player, download playlist, **CarPlay/Android Auto**, YouTube/Vimeo, limited-file-visibility). **Widgets** home-screen (Next Up/Rehearse/Scheduler) = seam. **Notif routing** (preferred-app N/A la 1 app; păstrăm toggles push per tip + badge unread|pending) → `pc_notificationPrefs`. My Schedule mobil (household schedule mgmt, accept-all/split/per-time, signup household), update team assignments din profil, Order drag&drop + unlink song, Teams (needed/schedule/import/contact), attendance mobil, Songs/add-file (**scan doc→PDF→OCR în Lyrics&Chords**, iOS), Media page (view-only create), People page (filtru perm-gated), tags (create doar pe web)
  - `#Perm` — **✅ PERMISIUNI SERVICES COMPLETE**: matricea exactă de capabilități per nivel (§5.6), ladder Song/Media fără „scheduler", STORED (3 dropdown-uri + file access) vs DERIVED (chat/LIVE/plan/scheduling), scope folder/service-type + „Same As Parent", org-default toggles `*` → `pc_servicesDefaults` (§5.7), flux Manage Permissions + bulk + downgrade=archive, **notificări** (welcome/upgrade/orgAdmin-removal) (§5.8)
- **Următoarea așteptată:** NIMIC obligatoriu — arhitectura e **completă pentru felia de build**. (Services LIVE + Reporting rămân amânate; se absorb când/dacă le trimiți.) **Următorul pas = screenshot-uri People + „start build".**

---

## 1. Invariante ne-negociabile (guardrails) — NU se schimbă niciodată
Acestea protejează arhitectura pe termen lung. Orice decizie viitoare le respectă.

1. **Modul izolat (bounded context).** Tot Planning Center stă într-un SINGUR loc logic, separat de restul appului (care e deja uriaș). Granițe clare, comunicare prin contracte/evenimente — **fără cuplaje fatale**.
2. **Schemă ADITIVĂ + migrații versionate.** „Am uitat ceva" = adaugi o colecție/un câmp nou, **niciodată** rescrii tot. Fiecare document are `schemaVersion` pentru migrații sigure.
3. **Concurență corectă din zi 1.** Operații atomice (`findOneAndUpdate` cu condiții), **indici unici** pe combinațiile critice, optimistic locking unde e nevoie. „Doi lideri în aceeași secundă" = rezolvat la nivel de DB.
4. **Autorizare server-side pe fiecare rută** (capability-based, vezi §5). Niciodată încredere în client.
5. **Performanță din design.** Indici pe interogările frecvente, paginare, fără over-fetch, realtime prin **socket-ul existent**. (300 oameni = scală mică; o inginerim corect oricum.)
6. **Fără dependențe scumpe/copyright.** Doar open-source matur (ex: ChordSheetJS, expo-print). Fișiere pe storage ieftin.
7. **Fără scurtături nesigure.** „Merge acum dar e fragil/nesecurizat" = INTERZIS.
8. **Fișierele NU stau în Mongo.** Audio/PDF/imagini → object storage (Cloudinary existent / Cloudflare R2). DB ține **doar metadata + URL**.
9. **🌍 Timezone-aware din zi 1 (multi-campus).** Toate datele/orele se stochează în **UTC** și se afișează în **timezone-ul campusului** (sau al userului). Niciodată „naive local time". Default **România (Europe/Bucharest, 24h, ZZ/LL/AAAA)**, dar fiecare **filială/campus are tz propriu** (avem filiale în alte țări). Plan/PlanTime/Blockout poartă `campusId` → tz pentru afișare + pentru detectarea conflictelor cross-timezone.
10. **🤖 AI-ready din zi 1 (seam global).** Există un **AI Gateway** global prin care ORICE feature poate primi acțiuni AI, fără rearhitecturare. AI respectă permisiunile userului, trece prin aceeași validare/authz, e auditat și bugetat. Detaliu §10. **Nu construim funcționalități AI acum — construim doar poarta.**
11. **🔌 API-first intern → public mai târziu.** Backend-ul modulului e organizat ca **servicii în spatele unor rute versionate** (`/api/pc/v1/...`). Appul consumă aceleași rute. Expunerea publică (API keys scoped + rate-limit) e un seam gata pregătit. Detaliu §11.
12. **✉️ Email ca serviciu provider-agnostic.** Un `emailService` unic (transactional + bulk) în spatele unui provider swapabil (SES/Resend/SendGrid). Mandatoriu, volum mare. Detaliu §12.
13. **🏢 Org-scoping seam (`orgId`) din zi 1.** Fiecare document PC poartă `orgId` (default = organizația unică a deployment-ului) și TOATE citirile/scrierile trec printr-un helper de scoping. Rulăm **single-org per deployment** (replicabil prin config+seed), dar seam-ul permite **multi-tenant viitor fără retrofit** — „jobul complex, făcut o dată". Vezi §14.6.A.

---

## 2. Izolarea în DB & granițele modulului
*(răspuns direct la grija ta: „DB-ul deja uriaș, vreau tot într-un singur loc modular")*

- **Scope = 3 sub-contexte într-UN modul:** **Services** (planuri/order/songs/scheduling), **People** (roster/permisiuni — se sprijină pe `users` existent), **Calendar** (camere/resurse/evenimente). Sub-foldere interne clare, dar un singur modul `pc_`.
- **Prefix colecții:** toate colecțiile modulului poartă prefixul **`pc_`** (`pc_plans`, `pc_songs`, …) → se grupează vizual într-un singur loc în orice viewer de DB. *(prefixul e ajustabil — ex. brand bisericii)*
- **📁 CERINȚĂ HARD (user): UN SINGUR FOLDER PĂRINTE pe fiecare parte**, ca să nu umbli peste tot:
  - **Backend:** TOT în `server/planning-center/` (sub-foldere: `models/`, `routes/`, `services/`, `middleware/`, `validation/`, `events/`, `seed/`). Nimic împrăștiat în restul `server/`.
  - **Frontend:** TOT în `app/planning-center/` (sub-foldere: `navigation/`, `screens/people/`, `screens/plans/`, `screens/songs/`, `screens/media/`, `screens/schedule/`, `components/`, `api/`, `theme/`). Modular pe ecran (regula ta).
  - **Singura atingere în afara folderelor:** 1 linie în navigatorul principal al app-ului (tab „Resurse"→„Planificare" care montează navigatorul PC) + 1 linie de înregistrare rută în `server`. Restul = 100% în folderele părinte.
- **📱 Shell „app-in-app" (CONFIRMAT user):** modulul trăiește în spatele tab-ului din footer **„Planificare"** (fostul „Resurse"). La intrare, se montează un **navigator imbricat propriu** cu **bottom nav-ul Planning Center** (Schedule/Plans/Songs/Media/People), iar tab-bar-ul principal al app-ului **se ascunde**. Există o cale clară de **ieșire** înapoi în app-ul principal (back/close). Mobile-only (fără web). → detaliu §7.
- **Legătura cu restul appului DOAR prin `userId`** (referință la colecția `users` existentă). **Fără câmpuri noi pe colecțiile existente** — excepțiile se documentează aici explicit.
- **Comunicare cu restul appului prin evenimente** (ex: notificări), nu apeluri directe încrucișate.

> **Notă „cum facem":** modulul trebuie să poată fi „citit" de unul singur — un dev nou (sau alt AI) deschide `server/modules/planningCenter/` + `app/screens/services/` și înțelege tot, fără să scormonească în restul appului.

> **🔗 Puntea între sub-contexte (confirmat #7):** Calendar și Services se leagă prin **`pc_connections`** (ex: un *Plan* din Services ↔ un *Event* din Calendar). Legătura e **explicită și decuplată** (o colecție de legături), NU referințe încrucișate băgate în ambele. Așa, Calendar și Services rămân module separate care se pot lega opțional, fără cuplaj fatal.

---

## 3. Decizii confirmate din documentația ta

### Din bucata #1 (overview / search / notificări / media):
- **Person-centric.** People e baza centrală a PCO; totul se leagă de un profil unificat. → La noi: **o singură entitate persoană = `users` existent**. Modulul `pc_` o **referențiază** (userId), nu o copiază. Zero duplicare de oameni.
- **O aplicație, două fețe.** „Planning Center" (staff/lider) + „Church Center" (membru). → La noi: **aceeași app, vederi diferite pe baza permisiunilor** (nu două apps). Membrul vede „programările mele / calendarul meu"; liderul vede unelte de planificare/programare.
- **Notificări:** push (`expo-notifications`) = canal principal pentru cereri de slujire + remindere. **SMS/email = seam viitor** (lăsăm loc, nu construim acum).
- **Search în modul** peste: `people`, `songs`, `media`, `teams`, `positions`. *(design seam pentru search de la început.)*
  - Nuanță PCO „People vs Never Scheduled" (oameni care pot intra în Services vs doar în DB). → La noi echivalentul: apartenența la o echipă / flag de „roster" pe persoană. *(de confirmat la bucata Teams/Scheduling)*
- **Media = tip de item de sine stătător** în order (nu doar cântări). → modelul de `pc_planItems` trebuie să suporte mai multe tipuri (header / song / media / element liber).

### Din bucata #2 (Setup Services — MIEZUL):
- **ServiceType = container de planuri de același tip** (Contemporary ≠ Traditional → service types separate). Confirmat `pc_serviceTypes`.
- **Plan = o slujbă/eveniment datat(ă)**, trăiește într-un service type; conține Order + Teams + Times. Confirmat `pc_plans`.
- **Team → mai multe Positions** (worship leader, sound tech, greeter…). Confirmat `pc_teams` + `pc_positions`.
- **Team ↔ ServiceType = MANY-TO-MANY.** O echipă trebuie **asignată** la un service type înainte de a fi programabilă. → entitate de legătură `pc_teamServiceTypes` (sau array indexat). **Decizie de modelare importantă.**
- **PlanTimes = ore multiple per plan** (service time, rehearsal time…). **Programările (assignments) se leagă de ore SPECIFICE**, nu doar de plan → „omul știe exact CÂND e nevoie de el" + bază pentru detectarea conflictelor. → `pc_planTimes` + `pc_assignments.timeIds`.
- **Roster confirmat:** în Services intră DOAR oamenii pe care-i programezi (nu toată baza People). → flag/apartenență pe persoană (membru al ≥1 echipe sau marcaj explicit „în roster"). Rezolvă întrebarea deschisă din v0.1.
- **Media library = separată de Songs** (slide-uri predică, video, curriculum). → `pc_mediaItems` distinct de `pc_songs`.
- **Plan page = 2 tab-uri:** **Order** (ordinea serviciului → `pc_planItems`) + **Teams** (programarea → `pc_assignments`).

### Din bucata #2 (Calendar / People / Admin — produse ADIACENTE):
- **Calendar (produs PCO)** = rezervări de **camere + resurse + evenimente** cu **grupuri de aprobare** și **conflicte de booking**. **Produs SEPARAT de Services.** → vezi §8: în scope sau nu? Implicit **OUT**, cu seam (un plan poate referi o locație/cameră mai târziu).
- **People — niveluri de permisiuni** (Manager/Editor/Viewer/Workflows-only). → confirmă abordarea **capability-based** (§5); noi rămânem la 2 roluri, dar granularitatea e seam.
- **Admin:** contul e deținut de organizație, **minim 2 org-admini** mereu; nu permite rămânerea fără admin. → regulă de validare + rol `admin`/super-admin la nivel de app (deja îl ai).

### Din bucata #3 (Roluri & permisiuni — model complet):
- **Permisiunile sunt MULTI-DIMENSIONALE** (nu un singur nivel). Dimensiuni: People&Plans, Song, Media, **file access (independent)**, leadership pe echipă, LIVE, Chat. → vezi §5 pentru modelul complet.
- **Scope per folder / service-type** cu moștenire „Same As Parent". → entitate nouă **`pc_folders`** (organizează service types) + permisiuni scoped.
- **File access ≠ nivel de permisiune.** Flag separat (plan/song/media files). ⚠️ cel mai ușor de uitat la UI → notat în §9.
- **Leadership team-scoped** confirmat: `scheduler` acționează doar pe „teams they lead". → `pc_teamMembers.isLeader`.
- **Niveluri:** `scheduledViewer < viewer < scheduler < editor < administrator < orgAdmin` (moștenesc în sus).
- **Billing manager** (PCO account settings) = **N/A** la noi (nu avem billing PCO). orgAdmin = super-admin existent.
- **Notificări la schimbări de permisiuni** (upgrade → notifică persoana; scoatere orgAdmin → notifică toți orgAdminii). → la noi push; notat în §9.

### Din bucata #5 (Security / AI / API / Email):
- **Security (avem deja mult — doar aliniem):** 2FA/two-step, expirare sesiune (PCO: 14 zile inactivitate), **privacy mode** (date de contact ascunse by default), **inactive ≠ delete** (soft-delete cu motiv, păstrezi dovada), **verificare identitate înainte de schimbarea email/telefon** (anti-impersonare), **bannere de risc** pe cereri suspecte, **system/audit logs** pt. schimbări sensibile. → §13 (mapat la `securitylogs` existent).
- **Connect AI tools (MCP):** PCO expune un server MCP; AI-ul extern vede DOAR ce permite permisiunea userului; admin controlează cine se conectează (All / Specific / Admins-only). → confirmă modelul din §10: AI respectă authz + control admin + audit.
- **PCO API** (Calendar/Check-Ins/Giving/Groups/People/Services). → noi: **API propriu** scalabil ca seam (§11).
- **Email (Mailchimp)** = marketing/bulk pe liste. User: **email mandatoriu, oricâte, chiar plătit.** → §12 (Mailchimp devine integrare opțională, dar avem email propriu).
- **Integrații gestionate de admin** (add-ons, external connections, control acces). → `pc_integrations` + control admin (§11/§13).

### Din bucata #6 (Toolbar + Dashboards):
- **Toolbar (dreapta):** Profile (my profile / login settings / logout), Help & support, **Notificări (bell)** cross-feature, **To-do/Tasks** (+ workflows, convertești o notificare în task), **Chat**. → §7 + §9.
- **Dashboards (Home):** tab-uri de dashboard (ex. per campus) cu **widgets** (upcoming events, „Scheduled" chart, upcoming group events), „+ New dashboard", „Add widget". → seam `pc_dashboards` / `pc_widgets`, scoped pe campus.

### Din bucata #7 (Calendar complet):
- **Event** = unitate centrală Calendar: nume, owner (default = creator) + managers, calendar, campus, tag-uri (Department/Event Types/Language/Campus), published/unpublished (vizibilitate Church Center), recurring, schedule (times incl. setup/teardown), rooms & resources, details (≤255), notes, approval_status, folder, „include on shared calendars", „include on kiosks". → `pc_events` + `pc_eventTimes`.
- **Rooms** (spații: sanctuar, teatru, sală) și **Resources** (obiecte/servicii cu cantitate: scaune, mese, dozatoare, A/V, chei, childcare). Pot sta în foldere; pot avea **întrebări opționale**. → `pc_rooms`, `pc_resources`, `pc_roomResourceQuestions`.
- **Requests → Bookings:** o cerere leagă room/resource de un event (cantitate, room setup, răspunsuri la întrebări, approval_status); la aprobare devine **booking** (rezervare fermă). → `pc_roomRequests`, `pc_resourceRequests`, `pc_bookings`, `pc_roomSetups`.
- **Approval groups:** grupuri care aprobă/resping cereri (camere/resurse/evenimente pending/form submissions). Asignabile la oricâte camere/resurse/calendare/forme. **Un singur aprobator din grup e suficient.** Auto-aprobare dacă un membru al grupului cere propriul room (dar formele cer MEREU aprobare). → `pc_approvalGroups`. Stare: pending/approved/rejected (state machine, §6).
- **Multiple calendars:** org poate avea mai multe calendare, fiecare cu **culoare** + **setări de acces**. Event aparține unui calendar. → `pc_calendars`.
- **Tags + tag groups** (cu culoare) pentru filtrare + calendare partajate. → `pc_tags` + `pc_tagGroups`.
- **Event request forms** (publice): oameni cer evenimente FĂRĂ acces Calendar → cereri pending (toate cer aprobare). → `pc_eventRequestForms` (seam de forms).
- **Double-booking prevention** = scop central Calendar → §6 (concurență pe bookings).
- **Connections:** event ↔ alt produs (Services plan, Registrations). → `pc_connections` (§2 puntea).
- **Calendar permissions = dimensiuni NOI** (Event / Rooms / Resources / People + rol **Conflict Resolver**) → extind §5.
- **Views Month/Table/Week** + **calendar start day Sun/Mon** (setare org/localization) + warning icons (galben=pending, roșu=rejected) + published/unpublished → §9.
- **Email notifications granulare** (approval/event activity, comments, new conflicts, new events…): unele opționale (toggle pe profil), unele mereu trimise (upgrade permisiuni, acces calendar, rol-specific). Opt-out email ⇒ tot apare în toolbar. → leagă §12 (email) + centru notificări + **preferințe email per user**.
- **Reporting (Liquid):** PCO permite rapoarte custom cu Liquid (events/rooms/resources/bookings) + CSS. → **seam de reporting** (§8); candidat bun pt. generare cu AI (§10).
- **Activity tab** per event = audit → `pc_auditLog`.

### Din bucata #8 (Calendar detaliat):
- **🔑 Aprobare pe 2 NIVELURI, INDEPENDENTE:** (1) **event-level** (poate avea loc evenimentul? — unele calendare o cer; formele publice MEREU), (2) **room/resource** (fiecare cameră/resursă aprobată separat). Se procesează independent. Event-rejected = evenimentul moare (recreezi). Room-rejected ≠ evenimentul moare. Mai multe approval groups pe event → pending până răspund TOATE; orice respingere = event respins.
- **⚠️ Deciziile de aprobare sunt IREVERSIBILE** (approve/reject nu se pot anula → scoți+readaugi room, sau recreezi event). Design: tranziție terminală + audit.
- **Conflict blochează notificările:** dacă un event are conflict, cererile de aprobare NU se trimit până nu-l rezolvă un **Conflict Resolver**. Conflict cross-calendar: vezi doar room-ul în conflict, nu detaliile celuilalt event (privacy).
- **Approval groups:** create de people-editor, ≥1 membru, asignabile M2M la rooms/resources/forms/calendars; membrii NU sunt notificați la add/remove; nu se șterg cât sunt pe o formă.
- **Tags (bogat):** `pc_tagGroups` cu flag **Required** (≥1 tag din grup obligatoriu/event, asterisc roșu) + **sortOrder** (altfel alfabetic). `pc_tags` cu **color** + **churchCenterCategory** (filtru public) + „Individual Tags". Campus tags auto + mereu publice. Doar admin creează/editează. Ștergerea grupului șterge tagurile de pe toate evenimentele (destructiv).
- **Filtre — logică:** **același tag group = OR**, **tag groups diferite = AND**. Filtrare pe calendars/tags/rooms/resources/my-events(owner/manager/approver/subscriber)/feeds/more(booking status, event request status, CC visibility, connections, blockout vs event). „Fără tag" (NOT), „missing required". Salvate per user.
- **Event creation:** owner (primește toată comunicarea) + managers (editează, se abonează); **recurență** (frequency, end-on-date / after-N, custom „Mon+Wed"); all-day; **event templates**; **location = campus / custom / virtual(link)**; **vizibilitate Church Center = Unpublished / Published / Featured** (3 stări, nu 2!); public description vs summary vs internal notes (câmpuri separate).
- **Recurență + excepții:** editezi „this date" / „this and future" / all; instanță unică are câmpuri limitate; NU poți respinge o singură instanță (aprobarea e pe serie). → model de **overrides per-instanță** (`pc_eventInstances`).
- **Duplicate event** (copiază detalii + retrimite booking requests). **Bulk edit** (table view: owner/visibility/calendar/tags).
- **Feeds** (sync din Groups/Registrations) = **N/A** (produse PCO pe care nu le avem); păstrăm **iCal import/export** + `pc_connections` interne.
- **Activity feed** cu categorii (Bookings/Comments/Conflicts/Requests/Schedule/Settings) + comentarii interne + **email către requester** (forme) cu placeholders `{{ }}`, atașamente (≤10MB, max 5). → leagă §12 + `pc_auditLog`. Comunicarea e înregistrată (istoric email, undelivered tracking).
- **Resources pot avea detalii** (Expiration date, Serial number) + „Communication Request" pattern = resource + approval group comms + questions (nu e entitate nouă).

### Din bucata #9 (Calendar final):
- **Multiple calendars + ACCESS CONTROL:** event aparține EXACT unui calendar (many tags, one calendar). Calendar default (nume org) — nu se șterge, se redenumește; ștergerea unui calendar mută evenimentele în default. **Acces per-calendar:** „Specific people" (default) vs „Everyone". Cine n-are acces NU vede evenimentele nicăieri — **excepții:** admin vede tot; owner/manager/approver își văd eventul chiar în calendar inaccesibil. → `pc_calendars` + `pc_calendarAccess` (mecanism de privacy/authz la nivel de calendar).
- **Require event approvals PER calendar** (toggle + approval groups). Off→auto-aprobă pending. **Mutare între calendare schimbă statusul:** required→no = auto-approve; no→required = revine pending; required→required = aprobările grupurilor comune se păstrează, altfel pending.
- **Resolve conflicts:** cerere pe un room deja rezervat → warning; dacă insiști → **conflict** (aprobările revin la pending). **🛑 Blockout WINS:** nu poți cere un room blocat; bookingurile care se suprapun cu un blockout nou sunt **auto-respinse** + owner notificat. Conflict resolver notificat **la 30 min** după creare (delay ca owner-ul să ajusteze). Rezolvare: alegi cine primește SAU **împarți** room-ul între ambele (banner albastru). Motiv trimis owner-ului respins.
- **Blockout pe ROOMS/RESOURCES** (≠ blockout pe PERSOANE din Services): `pc_roomResourceBlockouts` distinct de `pc_blockouts`.
- **Connections vs Feeds:** Connections = link manual, fără sync, navigare între produse (widgets: Services arată confirmed/pending positions!). Feeds = sync auto Groups/Reg → **N/A**. Pt. noi relevant: Connection Calendar↔Services + task lists (`pc_tasks`).
- **Sharing (output):** **print** (month), **iCal feed** (read-only, scoped pe eventuri/room/resource/calendar; public-times vs full-schedule), **embed** (month/list/gallery, filtre, script/URL/iframe), **kiosk** (TV, doar evenimente APROBATE, refresh 5min, dark/light), **Church Center** (pagina publică). Mare parte = **seam-uri** legate de API public (§11).
- **Vizibilitate Church Center:** Published (public cronologic) / Featured (steluță, sus în gallery) / Unpublished (intern) + **Link-only** (published dar nelistat, URL shareable). Hide times din feed/kiosk per `eventTime` (icon calendar/kiosk).
- **Reports:** default (one-day / rooms&resources-for-event / all-year) + custom (Liquid/HTML/CSS), export PDF/web/CSV, opțiuni (room setup diagrams, public vs full). → §11.4.
- **Public-facing = a doua față** (membru/congregație): aceeași app, vede DOAR evenimentele published (List mereu on / Month / Gallery, până la 3, un default). Confirmă „two faces, one app" (§3 #1).

### Din bucata #10 (Event request forms + Automations):
- **🧩 FORM ENGINE (generic, reutilizabil):** formulare publice pt. cine n-are acces Calendar (cer MEREU aprobare). Config: owner default, approval groups, calendar, descriere rich-text, allow-recurring, status **Open/Closed/Archived**. **Câmpuri (drag-drop):** Event Fields (Event Template / Room / Resource) + Basic (Checkboxes/Date/Dropdown/File/Number/Paragraph/Section Heading/Text), cu required + options + „other". **Logică condițională** (arată câmpul doar dacă altă întrebare are un răspuns). Regula: Event Template field XOR Room/Resource field. Always-collected: user/name/start/end/description. → `pc_forms` + `pc_formFields` + `pc_formSubmissions`. **Engine-ul e general** — îl putem refolosi pt. orice formular în app (nu doar evenimente).
- **Event request workflow:** requester trimite → owner **„Apply & Edit" rooms/resources** (stare „penciled-in" până sunt aplicate; Approve e dezactivat până atunci) → 2 aprobări (room/resource + event-level) → toate approval groups trebuie să răspundă; orice reject = event respins, re-submit. Reject ireversibil.
- **⚙️ AUTOMATIONS ENGINE (generic):** per formular (extensibil global): **trigger** (on-submit / on-approved, opțional filtrat pe un răspuns) → **action** (trimite email din template, adaugă la workflow, creează+asignează task…). Istoric 32 zile cu status Success/Pending/Paused/Failed + retry. → `pc_automations` + `pc_automationRuns`. **Se leagă de event-driven (§2) + AI (§10)** — AI poate propune/compune automatizări. Vezi §11.5.
- **Payments în forms = N/A** la PCO (workaround Registrations). La noi: dacă vrem taxă pe cerere (ex. nuntă $250) → **seam de plată** (nu acum).

### Din bucata #11 (PEOPLE — pilon):
- **🔑 Profil persoană ≠ cont login.** `pc_people` = profilul autoritativ (poate exista FĂRĂ login — copii, importați), cu link **opțional 1:0..1** către `users` (auth). Când cineva se loghează → se leagă de `pc_people`. **Asta permite import bulk de 500+ oameni fără conturi.** Refinează backbone-ul (§4.1).
- **📥 CSV Import/Export (cerința ta):** import cu header-e mapate pe câmpuri, pas de **match fields**, opțiune „empty deletes existing", **preview** (new/updated/errors/identical), ignore selectiv, finish. **`remote_id`** = identificator extern pt. update fără duplicate. **Undo în 48h.** Profilul org-admin NU se updatează prin CSV (securitate). Doar profile, nu alte date. Template: `people_import_template.csv` (extensibil cu custom fields).
- **Households** (`pc_households`): grupează oameni (familie); primary contact; relevant pt. copii/permisiuni. Importul ține membrii aceleiași familii împreună.
- **🧩 Custom fields + tabs (engine generic):** admin creează tab-uri + câmpuri custom (text/dropdown/checkbox/date/number…) pt. info specifică (ex: data botezului). Folosibile în list rules / forms / profil public. **Permisiuni per-tab (collaborators)** → cine nu e collaborator vede „[hidden content]". Reutilizabil global.
- **📋 Lists (engine de segmentare):** filtre dinamice peste oameni (info + activitate cross-feature), auto-refresh sau manual; email/print/export/share; **bulk actions** + **automations** pe listă. = motor de query/segmente, se leagă de email (§12) + automations (§11.5).
- **🔄 Workflows (engine de pipeline/kanban):** procese multi-pas pt. oameni (follow-up, onboarding); „cards" avansează prin pași; notificare când un card e Ready; permisiuni per-workflow. Capabilitate nouă (`pc_workflows` + `pc_workflowCards`).
- **📝 Notes (cu categorii):** note pe profil (inclusiv **prayer requests** → se leagă de features-urile de rugăciune existente!); categorii cu **collaborators** (view/create/manage) + categorii private + digest zilnic.
- **👯 Duplicate detect/merge:** potrivire pe first/given/nickname + last + email; detector + merge (păstrează ambele emailuri, alegi primary, păstrezi numele cum le-a scris persoana). Prevenție: require-login la forms/signups. Important pt. „fără balamuc".
- **📖 Directory (membri):** director privat; inviți oameni; **fiecare alege ce partajează**; statusuri can-view / is-listed / declined; verificare identitate la invitație. (= față publică People, cu privacy per-persoană.)
- **Membership types** (configurabile), **child vs adult** (copilul nu-și schimbă contactul; household îi gestionează programul), **campus primar** pe profil.
- **Bulk actions** (update mulți deodată: membership/campus/add-to-team…), pe indivizi/liste/households.
- **Config People:** custom email senders, **email templates** (§12), **spam list** (blochează emailuri la forms), note categories, background checks (Checkr/manual = **seam**, pt. voluntari), promote grades (**N/A** — Check-Ins).
- **Overview/Dashboard:** demografie, membership, campuri, recently created, my workflow cards, potential duplicates. (widget-uri → `pc_dashboards`.)

### Din bucata #12 (People detaliat — rafinări):
- **Profile edit rules:** profilul unui org-admin se editează doar de org-admin; doar org-admin schimbă login method; **primary** email/phone (steluță) dintre mai multe; verificare identitate la schimbare email/telefon pt. cineva cu acces la DB.
- **🔴 Inactive ≠ Delete (cascadă cross-modul):** `inactive` = scoate permisiunile peste tot, nu se mai loghează, istoricul rămâne, REVERSIBIL. **Cascadă:** Services → declinat la planuri viitoare + scos din echipe/leader; Directory → scos. `delete` = permanent, orfanizează istoricul, DOAR test data. Reactivarea NU redă permisiunile automat.
- **GDPR partial-erasure:** org-admin poate șterge permanent anumite puncte de contact (email/telefon/adresă) din Activity, păstrând profilul (pt. istoric). → drept la ștergere parțial.
- **Merge detaliat:** doar dacă login method identic sau doar unul are login; primary păstrează câmpurile cu o valoare; multi-valoare (emailuri/telefoane/checkbox custom) păstrate din ambele. Detector: match exact/similar/nickname; EXCLUDE gen diferit, aceeași gospodărie, sufix diferit.
- **Activity per persoană** (`pc_activity`): feed cross-feature (check-in/group/served/registered), gated pe permisiuni per domeniu.
- **Forms — 3 CATEGORII de câmp:** **Profile fields** (updatează profilul), **Workflow fields** (adaugă la workflow după răspuns), **Basic fields** (doar stocate). First/last/email mereu colectate. **Email NU se updatează prin form** (creează duplicat). Settings: collaborators (manage/view), notification list, status Open/Closed, „submit on behalf of household member", require-login. Spam protection + spam submissions (90z). Submissions: search/filter/export CSV/print PDF. Share: public URL / QR / embed (modal). Duplicate/archive/delete (recovery 30z).
- **Comunicare (leagă §12):** email din profil/listă/bulk; **custom senders** (From + Reply-to verificat + collaborators); **templates** cu `{{placeholders}}`; trimise individual (fără CC); drafts; **scheduled** (până la 1 lună); **message history**; unsubscribe tracking. **Mailchimp = opțional** (la PCO pt. >500/formatare — la noi **SES scalează**, deci nu ne trebuie workaround-ul). **SMS = N/A** (push), dar dacă vreodată: **consimțământ obligatoriu** (opt-in + STOP/START). **Church Center message = push**-ul nostru.
- **Notificări:** assignări (workflow/form/note); card workflow asignat → email **bundled** (după 10 min liniște); overdue; **digest zilnic** pe categorie de note (6am). → engine de notificări cu digest+bundling.
- **Staff transition (ownership recovery):** la plecarea cuiva, reasignezi ownership-ul listelor/workflows/automations/note-categories/custom-fields/events/teams. **Views „Unassigned"** ca org-admin să le revendice. ⚠️ important anti-„balamuc": entitățile au owner + mecanism de recuperare.

### Din bucata #13 (Lists — rules engine detaliat):
- **🧠 Rules engine ierarhic:** o listă are mai multe **rules**, fiecare cu mai multe **conditions**. Logică **all/any/none** la nivel de rule ȘI de condition; la 3+ condiții → **at least / exactly / at most**. **include/exclude** per condiție. Condițiile pot viza orice feature (gated pe permisiuni în acel domeniu). → modelăm `rules` ca structură imbricată serializabilă (nu hardcodat).
- **Expansiune household (`resultsWillShow`):** rezultatele pot fi „exact matches" SAU oameni **înruditi** (toți membrii gospodăriei / copii / adulți / părinți / primary contact) — fără ca rudele să îndeplinească criteriul. Important la email/mailing.
- **Auto-refresh** (frecvență) — esențial pt. automations/workflows; notificare la adăugare de profile în refresh. „since X days" = azi + X zile anterioare.
- **Condition ownership:** o condiție creată de un manager NU poate fi editată de altul (doar duplicat + șterge originalul). → `createdBy` pe fiecare condiție.
- **Views liste:** All / My / Recently viewed / **Starred** / **Unmanaged** (org-admin revendică) / **Needs attention** (condiții invalide). 
- **Results tools:** send message (email/text/CC push), export CSV, print report, **bulk action**, coloane customizabile, sort, **playlist mode** (navighezi profil-cu-profil pt. editări rapide).
- **Reports din listă:** built-in (mailing labels Avery, couples, households) + custom (Liquid/HTML/CSS). → extinde §11.4. **Mailing labels fizice = seam** (low-prio pt. app mobil).
- **Liste pt. securitate/cleanup:** monitorizare schimbări profil/admin recente, profile fără info, inactivitate → se leagă de audit (§13) + workflows.

### Din bucata #14 (🎯 SERVICES — pilonul central, intro):
- **Ierarhie confirmată:** Folder → ServiceType → Plan → (Order items + Teams schedule + Times + Files + Notes). Teams aparțin service-type-urilor.
- **🗓️ Scheduling — motorul:** din tab-ul Teams al unui plan, **Team Actions**: (1) **Add People** (programează pe cineva, inclusiv guest), (2) **Import Template** (scheduling template), (3) **Needed Positions** (câți per poziție), (4) **Auto-Schedule**.
  - **Scheduling templates** (`pc_schedulingTemplates`): membri × poziții pentru rotații (ex. „1 și 3 duminică" vs „2 și 4"). Se importă în planuri.
  - **Needed positions** (`pc_neededPositions`): câte persoane per poziție per plan (chiar fără a ști cine). Afișează goluri neacoperite.
  - **🤖 Auto-Scheduler:** algoritm care, pe baza **needed positions** + **preferences**, propune programarea. **Candidat excelent pt. AI Layer (§10)** — „programează-mi echipa".
  - **📊 Matrix:** programezi **multe săptămâni deodată** (grilă planuri × oameni) + trimiți **UN email** cu toate cererile pe un interval (reduce spam-ul de emailuri).
- **Preferences ≠ Blockouts:** `pc_schedulingPreferences` = disponibilitate preferată (soft, pt. auto-scheduler); `pc_blockouts` = nu pot sluji (hard). **Regula ta** (blockout ↔ cerere pending) trăiește aici (§6).
- **Team type:** **rehearsal** (worship/AV → văd chord charts + MP3 pt. repetiție) vs **non-rehearsal** (copii/pastoral → doar files). Influențează ce vede membrul.
- **Team leaders (multipli):** programează/gestionează/emailează echipa LOR; **„replies to"** = cine primește accept/decline; preferințe notificări per lider (accept/decline/blockout). Creatorul echipei = lider default.
- **Ciclul cererii (membru):** email programare → **accept/decline** sau **sign-up pe poziții deschise**; decline → liderul poate re-programa poziția. `pc_assignments.status`: unconfirmed/confirmed/declined.
- **Scheduled viewer** vede planul DOAR după ce i s-a trimis notificarea (confirmă regula din §9).
- **Plan templates** (`pc_planTemplates`): exporți un plan ca șablon de **order**, îl imporți în planuri viitoare (≠ scheduling templates).
- **Files — scope:** **plan files** (doar planul) vs **service-type files** (apar în TOATE planurile acelui service type) — distincte de song files / media.
- **My Schedule (membru):** gestionează programul propriu + al **gospodăriei**; accept/decline; sign-up; blockouts; preferences; profil; acces plan+files; team chat; „Email My Leader".
- **CSV import oameni în Services** = doar org-admin.

### Din bucata #15 (Plan your service — detaliu + UI):
- **⚠️ TIME ASSIGNMENTS CONDUC TOTUL (regulă fundamentală):** dacă echipa/poziția unui om NU e asignată la ≥1 **service time** → planul NU apare în My Schedule / Church Center, FĂRĂ remindere, iar notificările blockout/conflict/preference NU funcționează. → entitate `pc_timeAssignments` (time ↔ team ↔ positions) + **reminder emails** per team per time.
- **3 tipuri de times:** Service (determină data planului; fără ea = „No dates") / Rehearsal / Other (arrival, setup/teardown). Color-coded pe zi.
- **Item-uri (Order):** section headers; **item leaders** (cine răspunde de item); **item row colors**; afișare toggle **timp specific vs lungime (min)**; **exclude item from a service time** (ex: doar la 9:00, nu la 11:00); drag-drop.
- **Series + title:** plan are titlu + **serie** (grupare predici cu artwork). → `pc_series`.
- **Create/copy plan:** quantity (mai multe deodată), copy-times-from, **template per dată**, recurență din service type. Copy plan → alegi ce incluzi (items/notes/teams).
- **🧩 Echipe speciale (din #15):**
  - **Secure teams** — cer **background check** valid ca să fii programabil.
  - **Split teams** — programezi oameni DIFERIȚI per service time (același team, împărțit).
  - **Tag teams** (`pc_serviceTags`) — pool comun de voluntari pe mai multe locații printr-un tag partajat.
  - **Backup teams** + **guests** (programezi pe cineva fără a-l adăuga ca membru) + **tags pe oameni**.
- **Collaborators (audit plan):** cine a adăugat/editat item/note/person/needed-position + când. → `pc_planCollaborators` (se mapează pe audit).
- **Attendance** — iei prezența în Services (din Teams tab). → `pc_attendance`.
- **Share plan:** **Services LIVE** link; **Public View** (Church Center) per plan + **Schedule Publish** per service type (auto în ziua serviciului, alegi ce detalii); **Worship Set** pe X/Facebook; **Permalink** (redirect la cel mai apropiat plan: Services/public/LIVE, before/after today, pe timezone-ul org). ⚠️ NU publica funeralii/nunți/privat.
- **Master Calendar (Services):** plans + blockouts + birthdays + anniversaries într-o vedere calendar; default folder per persoană.

### Din bucata #16 (Order/Notes/Files/Items — rafinări):
- **Template UNIFICAT (`pc_planTemplates`):** conține order items + notes + **teams + needed positions** (NU doar order; NU are times). **Import = MERGE** (adaugă, nu suprascrie; „clear order" întâi dacă vrei replace; needed positions ia **maximul**; persoanele importate umplu golurile). → unifică „plan template" și „scheduling template".
- **Item leader DINAMIC:** poate fi **poziție** (oricine e programat pe ea = leader automat) sau **persoană**. Dacă leaderul declină/e scos → scos automat ca leader. (≠ item notes = ce se întâmplă, cue-uri.)
- **Config la nivel de SERVICE TYPE (`pc_serviceTypeSettings`):** plan note categories, item note categories, **item row colors** (keyword→culoare; toggle per-user), **time preferences** (ce ore sunt disponibile în templates — necesar pt. split teams), public view fields, schedule publish, frequency, files.
- **Fișiere — tipuri:** upload / **stage layout** (builder scenă → `pc_stageLayouts`) / **video link** (YouTube/Vimeo) / **file link** extern / tag. **Scope:** service-type / plan / item / song / media. Storage limitat; delete→recover 30z.
- **Item details:** length min:sec + **before/during/after** service (before/after NU intră în durata totală); description; **CCLI reporting data** per song item; item notes auto-copiate din ultimul plan unde a fost programat cântecul.
- **Order item types:** Item/Header/Song/Media + shortcuts tastatură (h/i/m/s/x) + quick-add + „Clear order".
- **Split teams + time preferences:** tranziție 1↔mai multe service times; split team = oameni diferiți per oră; păstrează time preferences pt. revenire.
- **Plan notes:** categorie (service-type) + assigned teams → apar în **reminder emails** + pot fi trimise ca email separat. NU apar în scheduling emails.
- **Past plans** dispar din lista principală (navigare prin săgeți/range). **Delete plan → recover 30z** (soft-delete).

### Din bucata #17 (🗓️ Scheduling ADÂNC — inima):
- **🎯 Sistem conflict/blockout (badge-uri):** la programare, lângă fiecare om: **🟢 preferat / 🟠 nepreferat / 🟨 conflict (ore suprapuse) / 🟥 blockout SAU a declinat deja**. **4 tipuri de conflicte:** (1) preferences, (2) conflict de ore, (3) declined request, (4) blockout. **TOATE sunt WARNINGS, nu blocaje** — schedulerul poate forța (vede motivul blockout-ului). Conflictele = suprapunere de **ore ASIGNATE** pe toate planurile unui om. → engine de conflict-detection pe `pc_timeAssignments` + `pc_assignments` + `pc_blockouts`.
  - **Nota ta (cele 2 enforcement-uri):** (a) **scheduler** programează pe cineva blocat = doar WARNING (ca PCO); (b) **membru** încearcă blockout peste o **cerere pending** = **HARD BLOCK** (regula ta, mai strict decât PCO). Ambele în §6.
- **🤖 Auto-scheduler — ALGORITM:** prioritate în ordine: (1) **last scheduled date** (cel mai demult programat primul; sursă configurabilă: last-in-team/position), (2) blockouts/conflicts, (3) preferences (cântărite MAI PUȚIN). Nu umple o poziție dacă TOȚI au conflict/blockout/preference. **Undo** înainte de a părăsi pagina/matrix. Rulează pe 1 plan sau matrix. Team setting: auto-run la decline. → `pc_autoScheduleRuns`. **Candidat #1 pt. AI (§10)** — AI poate explica/îmbunătăți deciziile.
- **Prepared notification:** `pc_assignments.prepared` — dacă e „prepared" + email NEtrimis → membrul NU vede planul. Dacă nu e prepared → îl vede imediat.
- **Signup sheets:** membrii se auto-înscriu pe poziții **needed**; enable per plan / auto-enable new plans / per template; doar cei pe poziții needed văd; primele 100; sign-up → **confirmat**. → `pc_signupSheets`.
- **Replacement flow:** la **decline**, membrul poate alege un **înlocuitor** (dacă e activat) → înlocuitorul devine **confirmat automat** + motiv opțional. → `pc_assignments.replacementPersonId` + `declineReason`.
- **Blockout requests:** scheduler trimite email „Blockout Request" → membru: „Block Out Dates" / „I Have No Blockouts" → lider notificat; coloană **„Last Set Blockouts"**. → `pc_blockoutRequests`.
- **Preferences detaliate:** general (max plans/lună, /zi), **household** (same-plan / concurrent cu un membru al gospodăriei: prefer/nu), **per team** (up-to/lună, frequency, weeks-of-month, unavailable, split-team times). → refine `pc_schedulingPreferences`.
- **Assign people to times:** override per-persoană al orelor (≠ default-ul echipei). Conduce My Schedule/emails/calendare sincronizate.
- **Reschedule plans:** shift întreg plan ±săptămâni (reset status opțional) SAU doar order-of-service (creează planuri noi, vechile = „Rescheduled"). **Remove/reset teams** (bulk; reset→pending, declined rămân declined).
- **Guests / temporary positions:** guest (ne-membru), poziție temporară (italic, nu se adaugă în team), replies-to per persoană.
- **Rehearse tools:** **media player** (playlist song files + skip remembered + loop + video thumbnails; exclude Spotify/Apple), download fișiere, **📕 PDF Songbook** (compilat chord charts/lyrics + cover sheet custom), **🎵 Music Stand** (reader cu **ADNOTĂRI** pe chord charts/sheet music) — add-on la PCO, la noi = reader propriu. → `pc_annotations` (per user, per file).
- **Volunteer pipeline:** People **form** → **workflow** → acțiune **„Add to Team"** (Services) → schedule. (punte People↔Services via automations §11.5.)
- **Shifts (large events):** split teams cu service time per tură + needed positions + signup. Tags pt. pool-uri de voluntari one-time.

### Din bucata #18 (Comunicare cu echipa):
- **Emailul de programare** (vezi §9 UI): per membru unconfirmed → Accept/Decline + View plan + poziția (echipa) + orele asignate. Trimis de persoana „Replies To".
- **Canale:** email + **chat** (per plan sau per echipă) + **push** (principal la noi). **SMS = N/A** (la PCO prin SMS gateway, abandonat de carrieri; in-app e mai fiabil — confirmă alegerea noastră push).
- **Trimitere țintită:** „Send for" (Prepared Notifications / Scheduled People / Needed Signups) × „With Status" (Pending/Confirmed/Declined) × teams × times. → engine de recipient-selection pe assignments.
- **⏰ Reminder emails (timezone-aware!):** automate, până la **7 zile înainte**, **per oră × echipă**, trimise **10:00 ora LOCALĂ** a zilei programate (⚠️ depinde de tz-ul campusului — §1.9). Doar confirmed+unconfirmed (NU declined). **Condensate** (mai multe într-o zi → un email). Includ: item-leader items + plan notes ale echipei + orele + accept/decline dacă unconfirmed. **Reminderul CLEARează prepared** chiar dacă emailul inițial n-a fost trimis. → `pc_reminderSettings` + job cron tz-aware.
- **„Replies To" (per echipă):** Current Scheduler / All Team Leaders / persoană — controlează **semnătura** + cine primește accept/decline.
- **Email templates — 4 tipuri:** General (+blockout requests) / Schedule (cu accept/decline+times, doar din plan/matrix) / Signup Sheet / Welcome. **Personal vs Shared** (admin poate shared; scheduler/editor doar personal). Placeholders `{{ }}` + source HTML.
- **Prepared notification (rafinat):** scheduled-viewer+unconfirmed+prepared = NU vede planul; viewer+prepared = vede dar nu pe My Schedule; fără conflict-warnings pe datele prepared; nu apare în liste de „scheduled". Default per echipă, override per persoană.
- **Părinți pe email copil:** `copyEmailsToHouseholdAdults` pe profil copil → adulții gospodăriei primesc copii (kids ministry). 
- **Reguli UX email:** NU pune ore în numele echipelor/service-times (redundanță în email) → folosește split teams. Undelivered tracking (→ `pc_commHistory`).

### Din bucata #19 (Organize + Manage people):
- **📍 Folder → campus → TIMEZONE (confirmă §1.9):** un `pc_folders` se leagă de un **campus**, iar campusul dă **timezone-ul** pentru reminder emails + calendar feeds. **Sursa de adevăr pt. tz la programări = campusul folderului.** Foldere nested (parent) + reorder service types.
- **Limited file visibility:** setare pe service type → membrul vede DOAR fișierele cu **tag-uri potrivite poziției** lui. → file-access pe `tag × position` (dimensiune file-access §5).
- **Tag teams (membri dinamici):** echipă ai cărei membri = toți cei cu un **tag** anume (poziția = tag-ul); nu se asignează individual. Util când mai multe echipe au exact aceiași oameni.
- **Master Calendar (Services):** plans + blockouts + birthdays + anniversaries; filtru pe service type/items; start day Sun/Mon (org-wide). Scheduled viewers văd doar echipele lor.
- **Service type lifecycle:** archive (ascunde service type + TOATE echipele lui) / delete (recover 30z) / restore (permisiuni → „Same as Parent"). Copy service type (duplică settings+teams, NU people/plans/members).
- **Archive vs Remove în Services** (≠ inactive/delete din People — acelea afectează tot contul): **archive** = fără login, scos din liste/chat, păstrează istoric, nu contează la limită; **remove** = permanent din Services (scoate și din planurile trecute → doar pt. cei niciodată programați). **Restore** → permisiuni reset la scheduled-viewer + file access default; team assignments/tags restaurate; **adnotările Music Stand restaurate**.
- **Default permission settings** (org-admin, account-level): nivel default new-user + acces plan/song/media; min-permission pt. (view team members / edit contact+households / export CSV / view people not on My Teams); cine poate delete (toți admins vs doar org-admin). → `pc_servicesDefaults`.
- **Current folder** per persoană (folderul în care aterizează la login). → `pc_people` / membership field.
- **Welcome email** cu conținut **condiționat pe permisiune** (`{% if scheduler %}`...). → template cu logică.
- **Filter people:** teams/tags/dates/permissions, logică **checkbox=OR / filter-to-filter=AND**, **pinned filters** + **URL state** (bookmarkable). **Bulk edit** (tags/assign-team/permissions/file-access) + istoric 30z + reselect.
- **Linked accounts** (multi-biserică): share blockouts + conflicte cross-church. **N/A** acum (o biserică), dar seam.

### Din bucata #20 (Team management):
- **4 tipuri de echipă (flags combinabile pe `pc_teams`):** **rehearsal** (membrii primesc acces la item files + media player + songbook **indiferent de permisiuni**; icon difuzor); **secure** (oricine poate fi membru, dar DOAR cei cu **background check Clear** pot fi programați; expirat → gri + shield; minor → BG manual expiră la 18); **split** (oameni diferiți per oră, necesită time preferences); **tag** (membri dinamici din tag-uri; „Add Person"→„Add tag").
- **Background checks** (pt. secure teams): Checkr (integrare, plătit) SAU manual. → `pc_backgroundChecks` pe persoană (status + expiry). **Seam** (decidem dacă la lansare).
- **Scheduling gap alerts:** notifică liderii cu ≤7 zile înainte, la **13:00 ora campusului** (alt job tz-aware → §1.9), despre poziții needed + membri unconfirmed. → setare pe team.
- **Rescheduling declines (5 opțiuni, setare team):** do-not-reschedule / manually-reschedule (creează needed) / volunteer-replacement / auto-schedule (trimite la următorul best) / signup-sheets (deschide signup la toți din poziție). → `pc_teams.onDecline`.
- **Access for scheduled viewers (setare team):** Full Plan (vede order+files) vs My Schedule Only. Full Plan = necesar pt. fișiere; rehearsal → forțat Full.
- **Scheduling defaults (team):** status default unconfirmed/confirmed (confirmed = FĂRĂ butoane Accept/Decline în email), prepared default, replies-to default.
- **Related teams:** echipe suplimentare care apar în „My Teams" (ex: Tech vede Band). → `pc_teams.relatedTeamIds`.
- **Replies-to (team/per-assignment):** Current Scheduler / All Leaders / specific. ⚠️ „Current Scheduler" = cine a adăugat persoana (poate fi stale, ex. din template vechi) → recomandat „specific/all leaders".
- **Merge duplicate teams:** primary + duplicates; istoric reasignat la primary; chat-ul duplicatelor șters; poziții/needed recreate; nu se poate undo (recover 30z).
- **Team lifecycle:** archive (ascuns, păstrează istoric) vs delete (pierde istoric, recover 30z) vs restore (shortcut tastatură x/R). „Potential Issues" (zero membri/poziții/never-scheduled) pt. curățenie.
- **Auto-assign:** scanează planuri/templates trecute → asignează la team oamenii programați dar ne-membri (cleanup).
- **Automations pe team:** trigger add/removed-from-team → acțiune (add to group/create task…). = **automations engine (§11.5)** extins la evenimente Services.
- **Take attendance:** per team sau toate, per oră; bife color-coded pe zi; folosibil în list conditions + activity. → `pc_attendance`.
- **Subscribe calendar:** feed **webcal/iCal per user** (confirmed plans; variantă URL cu blockouts). Read-only. → `pc_calendarFeeds` (per user, token).
- **Adding leader = scheduler permission** în acel service type.

### Din bucata #21 (Files & Media — IMPORTANT pt. clonă):
- **📁 Model UNIFICAT de fișier (`pc_files`):** `kind`: upload / **link URL** / **youtube** / **vimeo** / **chordChart** (editor ChordPro) / **textDocument** (rich-text→PDF) / **stageLayout**. Scope: plan / item / song(arrangement sau key) / media. Toate partajate ca **PDF** (dar editabile). Link/YouTube/Vimeo **economisesc storage** + YouTube/Vimeo apar în **planul public**.
- **🔊 Audio access:** default **Stream-only** vs **Allow Download** + „permission to override" (cine poate descărca oricum) + override per-fișier. ⚠️ **exact pattern-ul nostru Cloudinary** (stream, nu download) — copyright-safe. Modificarea default-ului afectează doar fișiere NOI.
- **🏷️ File tags:** grupuri default (**Lyrics/Chord Chart/Capo Chart/Number Chart** — nedeletabile; Rehearsal Mix; Custom). **Auto-assign pe keyword din filename** (+ „unless contains" exclude). **Max 15 tags/fișier**. **Untagged = toți văd.** → `pc_fileTags` cu reguli.
- **👁️ Limited file visibility (engine):** pe service type ON → membrul vede DOAR fișierele cu tag potrivit **poziției** lui + untagged. Best-practice: tag partajat (ex. „Rhythm Chart") pe mai multe poziții. (dimensiune file-access §5).
- **📊 License tracking (`pc_fileLicenses`):** `{ fileId, purchased (editabil), used (useri UNICI care au accesat), adminPersonId }`. **Fișierul rămâne accesibil** chiar la overage; **License Admin** notificat **săptămânal**. **Access Log** (stream+download per fișier) → păstrat pt. **CCLI reporting** (se pierde la delete permanent). Netrackat până nu pui „purchased".
- **⚖️ Copyright (confirmă discuția noastră):** 3 categorii — public/streaming, congregație, repetiție. Licențe: **CCLI** (Church Copyright / Streaming / Rehearsal / **SongSelect** transpozabil), MultiTracks (RehearsalPack/Streaming), PraiseCharts, CCS. → pt. noi: **CCLI necesar** pt. lyrics/charts; audio = link-out sau licențiat. Se leagă de §13 + nota de la lansare store.
- **🎬 Media items (`pc_mediaItems` + `pc_mediaFiles`):** container cu **unul SAU mai multe fișiere** (PDF+video împreună). `{ title, mediaType (audio/video/curriculum/powerpoint/document…), length, creator, themes[], autoArchiveDate, tags, primaryThumbnail }`. Sync cu software de prezentare (ProPresenter — seam). 
- **Storage mgmt:** Files page (Attached To / Size / Type / Created / Licenses), bulk delete, **restore 30z**. Extra storage plătit = **N/A** (noi: Cloudinary/R2). Archive media (Now/Later) ascunde din listă+plan dar **fișierele tot ocupă storage** (șterge fișierele). Delete = unrecoverable.
- **🎹 Lyrics & Chords editor (ChordPro):** creezi de la zero sau din SongSelect/PraiseCharts; **transpozabil** → fix abordarea noastră ChordSheetJS (detalii la bucata Songs).
- **Stage layouts:** template default sau custom (upload imagine scenă); tab People (etichete: Name/Small-Name/Initials, culori, drag) + tab Objects (instrumente/gear: culoare/size/rotate/flip); partajabile cross-service-type; output PDF.
- **Media filter (UI #21):** Content AND Type, cu **OR în același filtru / AND între filtre** (ex: Announcement AND (Image OR Video)).

### Din bucata #22 (🎶 SONGS + TRANSPUNERE — cireașa directorului muzical):
- **Ierarhie:** **Song** (title, CCLI#, authors, © year, themes, song-tags) → **Arrangement** (name, length, BPM, meter, **sequence** [Intro,V1,C,V2,C,V3,C×2,E], notes, album art, arrangement-tags) → **Key** (start/end cu **key change**, description „Female Key", **capos**). Fișierele se atașează la **Arrangement** (toate cheile) SAU la o **Key** anume. La adăugarea în plan: doar fișierele acelei song+arrangement+key.
- **🎹 TRANSPUNERE CHORD (simbolică — ușoară, confirmă ChordSheetJS):** **Lyrics & Chords editor (ChordPro)** built-in → la fiecare **key** adăugată la aranjament se **generează automat** un „Chord Chart in [Key]" PDF + capo + opțional **lyrics-only PDF** + **number chart** + **numeral chart**. **Charturile generate NU ocupă storage.** Transpunere live în plan (icon notă → orice gamă/numbers/numerals). → `pc_chordCharts` (sursa ChordPro + flags PDF + originalKey + formatting); render pe ChordSheetJS → expo-print.
- **📜 Coduri ChordPro speciale (pt. clonă fidelă):** `SECTION HEADING` (all caps); `[Chord]` (transpozabil, pe linia de deasupra, doar în Chord PDF); `TRANSPOSE KEY ±n` (schimbare cheie, scrii în original); `REDEFINE KEY ±n` (ai scris deja în noua cheie; remapează numbers); scala **Ab,A,Bb,B,C,Db,D,Eb,E,F,F#,G**; `{ notă }` (în ambele PDF); `{{ notă }}` (doar Chord PDF); `COLUMN_BREAK`/`PAGE_BREAK`; `<b>/<i>/<u>/<em>/<t>`; simboluri ∆(maj) ♭(flat) °(dim) ø(half-dim). **ChordPro previne shiftarea** acordurilor la transpunere/schimbare font.
- **🔢 Number/numeral charts:** number = acorduri→cifre pe scală (în D: 1=D,2=E,3=F#…); numeral = cifre romane (MAJ uppercase / min lowercase); out-of-key = bemoli (G# în C = b6/bVI); suffix superscript. **Doar output** (nu input).
- **🔊 TRANSPUNERE AUDIO (DSP — grea, confirmă recomandarea mea):** upload mp3/m4a/aac → popup Transpose Audio (from/to key, direcție up/down auto, name, results) → **queue server-side** → generează fișier per cheie. ⚠️ **„vocile sună ca veverițele/monștri cu cât transpui mai departe"** (pitch shift, viteza neschimbată) — EXACT ce ți-am zis. → `pc_audioTranspositions` (job queue). **La noi:** ffmpeg/rubberband server-side (ca PCO) SAU pitch la redare; recomand shift-uri mici.
- **Sequences:** etichete secțiuni (Verse/Chorus/Bridge), reordonabile, per-arrangement; apar sus pe charturile generate (nu pe PDF uploadate). Editabil în plan (one-time sau salvezi la arrangement).
- **Song vs Arrangement tags:** song-tags (toată piesa, ex. Christmas) vs arrangement-tags (per aranjament, ex. Speed: Fast/Slow). Grupuri (Ministry/Speed/Style). Filter Music/Content/Tags/History (OR-în-grup/AND-între).
- **Add song:** din **MultiTracks** (Popular Recordings) / **CCLI SongSelect** (All Songs, după title/artist/CCLI#) / custom. **Top Songs** (cele mai programate în toate bisericile, recalculat nightly). → la noi: top din datele noastre.
- **Integrări (externe, plătite — CONSTRUIM echivalentul + seam de import):** SongSelect (CCLI, charturi+lyrics editabile ChordPro), PraiseCharts (per-file, 5 licențe), MultiTracks/RehearsalPack (audio+charturi), RehearsalMix (mix per instrument, credite). → §11.6.

### Din bucata #23 (Integrări — atenție MAXIMĂ pe MultiTracks):
- **Check-Ins ↔ Services:** Check-Ins = produs PCO separat (**N/A** la noi). Concept util: **check-in voluntar → attendance** în ambele (match pe dată/oră + nume locație = team/position). La noi: attendance-ul propriu (`pc_attendance`) + eventual integrare cu check-in. Raport „Absent People".
- **🎸 MultiTracks (CRITIC — userul plătește mult):**
  - **RehearsalPack** = chord charts + lyrics + **audio original în toate 12 gamele** (NU stems); **fără seats**.
  - **RehearsalMix** = **stems audio per instrument** (Drums/Bass/Alto Mix…) în toate gamele; **seat-based** (plătit), + Playback software.
  - **ChartPro** = chord charts + slides customizabile (PDF).
  - **Account linking** (cont PC ↔ cont MultiTracks, per user) + **arrangement ↔ recording** MultiTracks (Change Recording/relink). Fișierele importate **NU ocupă storage**. **Seats** gestionate pe MultiTracks.com (doar org-admin); doar licensed users văd RehearsalMix/ChartPro.
  - **⚠️ REALITATE DE FEASIBILITY (CERCETAT 2026-10):** MultiTracks **NU are API public pt. terți**; integrările (PCO/ProPresenter/Playback) sunt **parteneriate** construite cu MultiTracks. În plus, **ToS-ul MultiTracks INTERZICE** urcarea propriilor mix-uri din stems (derivative work) + distribuirea fișierelor în afara licenței. → **nici fallback-ul „upload manual stems" nu e legal.** Concluzie: compatibilitatea MultiTracks = **chestiune de parteneriat + licențiere, NU tehnică.** Căi: **(A)** acord formal cu MultiTracks (ca PCO); **(B)** coexistență — app-ul nostru face tot (editor+transpunere+audio propriu), echipa folosește Playback MultiTracks separat. Playback se leagă azi de PCO, nu de noi.
- **SongSelect (CCLI):** OAuth cont CCLI; import **Lyrics** (text→editor) / **ChordPro Editable** (→ editor, transpozabil toate gamele) / **Chord Chart** (PDF fix per key). **Necesită activitate la 60 zile** (altfel dezactivat). **Copy limit** anual (fiecare import = 1 copie). Song necesită CCLI#.
- **PraiseCharts:** integrare **per-PROFIL** (nu org); fiecare user care importă se autentifică. Import: Chord Chart+Lyrics (TXT→editor transpozabil) / Arrangement-Key files (multi-key split) / **Orchestration** (All Parts PDF sau per-key split pe instrumente) / Chord Chart (PDF fix). Purchased vs Available (link cumpărare); 5 licențe/fișier.
- **Pattern comun (`pc_integrations` + `pc_integrationAccounts`):** cont extern linkat (org SAU per-user), import-adapter per furnizor, seats/licensed-users, status (connected/error/relink). → §11.6.

### Din bucata #24 (📱 Services Mobile — confirmă arhitectura, NU adaugă model nou major):
- **🧱 CONFIRMARE ARHITECTURALĂ MAJORĂ:** mobilul PCO **nu are un model de date separat** — e **aceeași bază, aceleași acțiuni**, doar o altă față. Tot ce vezi pe mobil (plan/order/teams/songs/media/people/schedule) e exact ce vezi pe web. → **validează §1.11 (API-first intern) + „one app, two faces" (§3/#1).** La noi: app-ul mobil consumă aceleași rute `/api/pc/v1/...` ca web-ul. Zero fork de logică. **Regulă:** nicio funcționalitate nu se implementează „doar pentru mobil" la nivel de date — se implementează în serviciu + API, apoi se consumă din orice client.
- **📴 OFFLINE / CACHE (rezolvă §8 „offline"):** fișierele audio descărcate se **cache-uiesc local până la 30 zile după data planului**; userul poate șterge manual (Settings → Cached Data → Audio Files / Files & images → Reset). My Schedule-ul e primul candidat la cache local (membrul își vede programările fără net). → **Decizie: cache client-side cu TTL legat de data planului; NU stocăm fișiere în DB (invariant §1.8), doar manifestul de download + metadata.** Vezi `pc_mediaPlaybackState`.
- **🔁 SKIP-SYNC CROSS-DEVICE (cerință fină, ușor de ratat):** dacă sari un fișier în playlist pe **web**, e sărit și pe **mobil**, și invers. La fel loop positions (pozițiile custom de loop pe un cântec sunt reținute). → necesită **stare de playback per-user, server-side**, NU doar local. Entitate nouă **`pc_mediaPlaybackState`** `{ personId, planId, skippedFileIds[], loopPositions:{ fileId:{start,end} }, downloadManifest[] }`.
- **🎧 Media player mobil:** tab-uri **List / Song / Lyrics / Docs / Notes**; play/pause/skip; **metronom built-in**; **loop** cu pozițiile reținute per cântec; **mini-player** (scrub pe progress bar, swipe-left + X pt. close); **download playlist** (alegi ce fișiere per cântec); **load another plan's playlist** (banner „ai schimbat planul"); **YouTube/Vimeo** redabile (Spotify/Apple = doar link, excluse din player); **limited file visibility** se aplică (vezi doar fișierele poziției tale); **Apple CarPlay / Android Auto** (doar audio, nu video) = **seam nice-to-have**; Siri shortcut = seam. Icon-ul profilului tău apare lângă cântecul pe care-l conduci (leader).
- **📲 Widgets home-screen (seam):** **Next Up** (următoarea oră programată, accept/decline din widget, cross-account dacă ai conturi linkate), **Rehearse** (lista de cântece + chei pt. următorul plan → deschide media player), **Scheduler** (pt. lideri: statusuri ?→✓ pe echipele conduse, text-message din widget), **Schedule & Rehearse** (combinat). Customizabil (ce echipe / din ce service type). → la noi: **seam**, derivat din `pc_timeAssignments`/`pc_assignments`; nu construim la lansare.
- **🔔 Notificări mobil:** PCO alege **„preferred app"** (Services Mobile / Church Center / Planning Center) pt. notificări de programare + chat — la noi **N/A** (avem **o singură app**), dar păstrăm: **toggles push per tip de notificare**, **badge count** = `unread messages` SAU doar `pending requests` (alegere user), **per-team chat notif prefs**, și **text (SMS) = N/A** (PCO folosește un „SMS gateway" email-to-text prin carrier; noi rămânem pe push). → entitate nouă **`pc_notificationPrefs`** (per user). **Services LIVE** trimite push cât timp LIVE e deschis în app.
- **📆 My Schedule (ecranul principal mobil al membrului):** scheduling requests + signup sheets disponibile + confirmed plans; **gestionarea programului membrilor gospodăriei** (dacă ai permisiune — comuți pe profilul lor); **set blockouts** + **email leaders** direct de sus. Răspuns la cerere: vezi data/service type/poziția + (dacă echipă rehearsal) **acces la media atașată** + orele cerute → **Accept/Decline**; **Accept All** (inclusiv pending pt. gospodărie); **Split** (răspuns separat per poziție); **accept per oră** (când ești cerut la mai multe Service Times). Decline cu **replacement** (dacă liderul a activat). **Signup sheets** (te înscrii pe tine/gospodăria ta pe poziții deschise, cu conflicte afișate). Vezi planuri **doar** unde ești programat; gospodăria = gri dacă n-ai viewer-permission; viewer+ accesează orice plan prin foldere (Plans tab).
- **👥 Update team assignments (scheduler, din profil):** People → persoană → Teams → **+** → alegi o echipă pe care o conduci → bifezi poziția → save; tap pe poziție = schimbi poziția / actualizezi scheduling preferences.
- **📋 Plans — Order of service (mobil, editor+):** navighezi plan ↔ plan; deschizi media player; **print report template**; schimbi coloanele afișate; **adaugi item prin drag&drop** din tipuri; **editezi item** (length/descriere/note/arrangements/media/files); **unlink song** (Android: option menu; iOS: swipe-left); **import item notes** din ultima folosire a cântecului.
- **📋 Plans — Teams (mobil):** **My Teams** (unde ești lider/programat) vs **All Teams** (unele permisiuni n-au acces la All Teams); scheduler+ ajustează **needed positions** (+/−), **programează persoană** (nume→echipă→rol), **import template** (din plan templates web), **contact** (email/text/call individual sau pe echipă).
- **✅ Plans — Take attendance (mobil):** editor/admin = orice echipă; scheduler = doar echipele conduse. Alegi ora → bifezi prezenți → Done. Checkmark **color-coded per zi**; apare în **Activity-ul profilului** + utilizabil ca **condiție de listă** (People); integrarea Check-Ins ar adăuga și ea checkmark (la noi = `pc_attendance` propriu).
- **🎵 Songs page (mobil, editor+):** add song din **Popular Recordings** (RehearsalMix DB, preview clip) / **All Songs** (CCLI SongSelect) / custom → arrangement info (length/BPM/meter) + chei (start/end/alternate) + **toggles import** (RehearsalPack/SongSelect/PraiseCharts/RehearsalMix dacă-s activate) → tags → save. Edit arrangement (chei/tags/upcoming schedule/files). **Sequences** (create/edit, labels default sau custom, drag-reorder, swipe duplicate/delete, toggle „Update Arrangement Sequence" pt. permanent vs one-time). Sequence apare sus pe charturile generate (nu pe PDF uploadate). *(toate = aceleași entități `pc_songs/pc_arrangements/pc_keys/pc_chordCharts` din #22)*
- **📎 Add a file (mobil):** din device/poză/link/**scan document** (⚠️ **iOS only**: camera → PDF multi-pagină → toggle „Import Text into Lyrics & Chords" = **OCR în editor**); „Attach To" verifică destinația (media item / song / arrangement / cheie anume); **„Copy to Services"** din share-sheet-ul altei aplicații; swipe = edit/delete. Doar **admin/editor** pot upload/edit/delete (editor șterge doar ce-a urcat el).
- **🖼️ Media page (mobil):** vezi media library + filtre (content type/tags/history); editor/admin pot **adăuga fișiere** la media items existente, **dar NU pot crea media items noi și nici edita detaliile pe mobil** (doar pe web). → confirmă că unele acțiuni de config rămân web-only by design.
- **🎼 Lyrics & Chords editor (mobil):** **ACELAȘI editor ChordPro** ca pe web (format, preview PDF, alegi cheia de tastare, auto-transpose PDF per cheie la save, enable Lyrics/Numbers/Numerals). Charturile create **nu ocupă storage** și nu apar în Files. → confirmă #22, disponibil pe ambele clienți.
- **👤 People page (mobil):** listă alfabetică după **prenume**; viewer = doar oameni din echipele proprii/related; scheduler+ = filtru pe team/tag/permission; email pe lista filtrată; add people (perm-gated de default permission settings).
- **🏷️ People tags (mobil):** scheduler poate adăuga/scoate tag-uri pe profil; **tag-urile NOI se creează doar pe web** (grup→tag). → confirmă: crearea de taxonomii = web; aplicarea = oriunde.
- **🔐 Login mobil:** „Save Login Details" (keychain/1Password), multi-account (link accounts din mai multe biserici) — la noi N/A (un singur tenant), dar păstrăm login persistent + logout + linkuri Open source/Privacy/Terms în Settings. **Dark mode** pe iOS urmează setarea sistemului (la noi app-ul e deja dark-themed).
- **📅 Subscribe to calendar (reconfirmă #20):** feed webcal/iCal read-only per user, variante URL cu/fără blockouts (`p/` vs `pnb/`), subscribe din web (Apple/Google) sau mobil (cere acces complet la calendar, read-only, nu editezi evenimentele în calendarul personal). → `pc_calendarFeeds` deja modelat.

---

## 4. Model de date (în construcție)
> Se umple pe măsură ce trimiți bucățile. Entitățile `(provizoriu)` vin din structura generală PCO și se confirmă cu docurile tale.

### 4.1 Backbone confirmat
- **Person = `pc_people`** (profilul autoritativ al congregatului; refinat #11) — poate exista FĂRĂ login. Câmpuri: nume (first/given/middle/last/prefix/suffix/nickname), gen, birthdate, marital status, contact (emails/phones/addresses), householdId, membershipType, campusId, status(active/inactive)+inactiveReason, deceased, child/adult, socialProfiles, school/grade, avatar, **medical notes (HIPAA — sensibil)**, **remote_id** (import), directoryStatus.
  - **Link login:** `pc_people.userId → users` **opțional (1:0..1)**. Userii existenți din app se leagă/creează `pc_people`. `pc_*` referențiază `personId` (și `userId` doar pt. auth/acțiuni).
- **pc_roles / capabilities** → vezi §5 (rol = date, nu cod).

### 4.2 Entități confirmate din docuri (relații stabilite, câmpuri de detaliat pe bucăți)
- `pc_serviceTypes` — container de planuri de același tip. ✅ confirmat #2
- `pc_plans` — `{ serviceTypeId, title, seriesId?, dates(from planTimes), publicView:bool, scheduleHint }`. Order + Teams + Times + Notes + Files. ✅ #2/#15
- `pc_series` — serie de predici: `{ name, art }`. ✅ #15
- `pc_planTimes` — `{ planId, type: service|rehearsal|other, name, startsAt(UTC), endsAt(UTC), weekdayColor, reminderSetting }`. Service time determină data planului. ✅ #2/#15
- `pc_timeAssignments` — **time ↔ team ↔ positions** `{ planTimeId, teamId, positionIds[], reminderSetting }`. ⚠️ CONDUCE My Schedule/remindere/notificări. ✅ #15
- `pc_planItems` — `{ planId, type: header|song|media|element, title, leaderId?, lengthSec|specificTime, rowColor, excludedTimeIds[], sequence; song → songId+arrangementId+keyId }`. ✅ #2/#15
- `pc_teams` — `{ name, flags:{ rehearsal, secure, split, tag }, relatedTeamIds[], schedulingDefaults:{ defaultStatus, prepared, repliesTo }, onDecline: none|manual|replacement|autoSchedule|signup, scheduledViewerAccess: fullPlan|myScheduleOnly, lastScheduledSource, gapAlert:{ enabled, daysBefore }, settings }`. ✅ #2/#14/#15/#20
- `pc_backgroundChecks` — `{ personId, status: clear|pending|expired, provider: checkr|manual, expiresAt }` (pt. secure teams). **Seam.** ✅ #20
- `pc_calendarFeeds` — feed webcal/iCal read-only per user (token + opțiune blockouts). ✅ #20/#24
- `pc_mediaPlaybackState` — **stare de playback per user, sincronizată cross-device (web↔mobil):** `{ personId, planId, skippedFileIds[], loopPositions:{ fileId:{startSec,endSec} }, downloadManifest:[{ fileId, cachedAt, expiresAt(=planDate+30z) }] }`. Skip pe web = skip pe mobil. **Fișierele NU stau aici** (doar referințe/manifest; invariant §1.8). ✅ #24
- `pc_notificationPrefs` — preferințe notificări per user: `{ personId, pushByType:{ [notifType]: bool }, badgeMode: unread|pending, chatByTeam:[{ teamId, muted }] }`. „Preferred app" PCO = N/A (o singură app). SMS = N/A (push). ✅ #24
- `pc_serviceTags` — tag groups (people/songs/arrangements/media/files) + required/multi; **tag teams** = echipă cu membri dinamici (toți cu tag-ul X; poziție=tag). ✅ #15/#19
- `pc_planCollaborators` — audit per plan: cine a adăugat/editat item/note/person/needed-position + când. ✅ #15
- `pc_attendance` — prezența luată în Services per plan/time. ✅ #15
- `pc_positions` — poziții în echipă, `teamId` + `name`. ✅ #2
- `pc_teamLeaders` — `{ teamId, personId, notifyAccept, notifyDecline, notifyBlockout }`. ✅ #14
- `pc_teamServiceTypes` — **legătură M2M** team ↔ serviceType (echipa e programabilă doar aici). ✅ #2
- `pc_assignments` — `{ planId, timeIds[], positionId, personId, status: unconfirmed|confirmed|declined, source: manual|template|autoSchedule|signup|group, isGuest?, isTemporaryPosition?, prepared, notificationSent, repliesToPersonId, declineReason?, replacementPersonId? }`. ✅ #2/#14/#17
- `pc_neededPositions` — `{ planId, positionId, count }` (goluri de acoperit). ✅ #14
- `pc_schedulingTemplates` — `{ serviceTypeId, name, entries:[{ positionId, personId }] }` (rotații). ✅ #14
- `pc_schedulingPreferences` — `{ personId, general:{ maxPerMonth, maxPerDay }, household:[{ personId, samePlan, concurrent }], perTeam:[{ teamId, upToPerMonth, frequency, weeksOfMonth[], unavailable, splitTeamTimes[] }] }` (soft, pt. auto-scheduler). ✅ #14/#17
- `pc_signupSheets` — `{ teamId, planId?, enabled, autoEnableNewPlans }` (membrii se auto-înscriu pe needed). ✅ #17
- `pc_blockoutRequests` — `{ senderId, recipientIds[], timeframe, responses:[{ personId, status: blocked|noBlockouts, respondedAt }] }`. ✅ #17
- `pc_autoScheduleRuns` — istoric rulări auto-scheduler (+ undo window). ✅ #17
- `pc_annotations` — adnotări per user pe fișiere (chord chart/sheet music) — Music Stand propriu. ✅ #17
- `pc_planTemplates` — **unificat**: order items + notes + teams + needed positions (fără times). Import = merge. ✅ #14/#16
- `pc_serviceTypeSettings` — `{ serviceTypeId, frequency, folderId, planNoteCategories[], itemNoteCategories[], itemRowColors:[{keyword,color}], timePreferences[], publicViewFields, schedulePublish, limitedFileVisibility, liveControlPersonIds[] }`. ✅ #16/#19
- `pc_servicesDefaults` — permisiuni default account-level (toggle-urile `*` din §5.7): `{ newUserDefaultLevel, whoCanCreatePeople, whoCanDeleteAnything, whoCanEditContactInfo, whoCanEditAssignments, whoCanCreateDeleteFolders, whoCanControlLive, whoCanRemoveMyTeamsFilter, directMessagesEnabled }`. Checker-ul de permisiuni îl consultă MEREU. ✅ #19/#Perm
- `pc_stageLayouts` — builder de scenă (poziții pe scenă) atașabil la plan. ✅ #16
- `pc_planNotes` — note specifice unui plan. ✅ #14
- `pc_planFiles` — `{ scope: serviceType|plan|item, kind: upload|stageLayout|video|link, url, tagIds[] }`, distincte de song/media (care vin prin item linkat). ✅ #14/#16
- `pc_songs` — biblioteca de cântări. ✅ #2
- `pc_mediaItems` — `{ title, mediaType, length, creator, themes[], autoArchiveDate, tagIds[], primaryThumbnailFileId, archived }` (container, 1+ fișiere). ✅ #2/#21
- `pc_mediaFiles` / `pc_files` — model unificat fișier: `{ kind: upload|link|youtube|vimeo|chordChart|textDocument|stageLayout, url, scope, parentId, audioAccess: stream|download, tagIds[], size, attachedTo[] }`. ✅ #21
- `pc_fileTags` — `{ group, name, autoAssignKeywords[], excludeKeywords[], isDefault }` (max 15/fișier; untagged=public). ✅ #21
- `pc_fileLicenses` — `{ fileId, purchased, used(unici), adminPersonId }` + Access Log (stream/download). ✅ #21
- `pc_blockouts` — zile indisponibile per persoană (`userId` + interval). ✅ #2 (detalii la bucata Blockouts)
- `pc_folders` — `{ name, parentFolderId, campusId (→ timezone pt. reminders/feeds), sortOrder }`; scope permisiuni (moștenire „Same As Parent"). ✅ #3/#19
- `pc_teamMembers` — `teamId` + `userId` + `isLeader` + `roleInTeam`. Sursa pt. roster + „teams they lead". ✅ #2/#3
- `pc_permissions` — permisiuni scoped & multi-dimensionale per persoană (vezi §5.5). ✅ #3
- `pc_mediaItems` / `pc_songs` au și **tags** (create/edit/delete de admin). → seam `pc_tags`. ✅ #3
- `pc_org` — setări organizație (un document): `{ churchName, email, website, phone, taxId, mailingAddress, logoLight, logoDark, defaultCampusId }`. ✅ #4
- `pc_campuses` — filiale: `{ name, country, timezone (IANA ex „Europe/Bucharest"), timeFormat (12/24), dateFormat (DMY/MDY), address, isMain }`. RO = campus principal default; fiecare filială cu tz propriu. ✅ #4
  - **N/A (marcate ca să NU construim):** Twilio/SMS/Text2Give (folosim push; SMS=seam viitor cu consimțământ), currency/Giving, grades (Check-Ins).

### 4.2bis Entități pentru capabilitățile globale (din bucata #5/#6)
- `pc_aiRuns` — audit AI: `{ userId, feature, action, inputRef, outputRef, model, tokensIn, tokensOut, cost, status, createdAt }`. (§10) ✅ #5
- `pc_aiConfig` — flags on/off + bugete + provider/model, global/per-feature/per-rol. (§10) ✅ #5
- `pc_apiKeys` — chei API scoped (capability + rate-limit), pt. expunere publică viitoare. (§11) ✅ #5
- `pc_integrations` — conexiuni externe (Mailchimp/CCLI/MCP…) gestionate de admin + nivel acces. (§11/§13) ✅ #5
- `pc_emailTemplates` — `{ type: general|schedule|signupSheet|welcome, scope: personal|shared, title, body, placeholders }`. (§12) ✅ #5/#18
- `pc_reminderSettings` — `{ planTimeId, teamId, daysBefore(0-7)|none }`; job tz-aware trimite 10am local. ✅ #18
- `pc_emailLog` — `{ to, templateId, providerMsgId, status, sentAt, opens? }`. (§12) ✅ #5
- `pc_auditLog` — schimbări sensibile (permisiuni, contact, AI, integrări). Se poate mapa pe `securitylogs` existent. (§13) ✅ #5
- `pc_tasks` — to-do/tasks (o notificare poate deveni task). (§7) ✅ #6
- `pc_dashboards` / `pc_widgets` — dashboards per campus cu widgets. **seam**, nu core acum. (§7) ✅ #6
- **Flag-uri pe persoană (pe `users` sau `pc_` extension):** `privacyMode` (date contact ascunse), `inactive` + `inactiveReason`, `riskFlag`. (§13) ✅ #5

### 4.2ter Entități Calendar (din bucata #7)
- `pc_calendars` — `{ name, description, color, isDefault, requireEventApproval, approvalGroupIds[], accessMode: everyone|specific }`. Default nu se șterge. ✅ #7/#9
- `pc_calendarAccess` — `{ calendarId, userId }` (când accessMode=specific). Mecanism de privacy la nivel calendar. ✅ #9
- `pc_conflicts` — `{ roomOrResourceId, eventAId, eventBId, status: open|resolved, resolution: give_to_A|give_to_B|shared, reason, resolvedBy }`. ✅ #9
- `pc_roomResourceBlockouts` — blockout pe room/resource (≠ blockout pe persoană): `{ roomOrResourceId, startsAt, endsAt, reason }`. **Câștigă automat conflictele.** ✅ #9
- `pc_events` — `{ name, calendarId, ownerId, managerIds[], tagIds[], visibility: unpublished|published|featured, linkOnly, publicSlug, recurrenceRule(RRULE/iCal), allDay, eventTemplateId?, location:{type: campus|custom|virtual, value}, eventImage, publicDescription, summary, notes(intern), approvalStatus, folderId }`. ✅ #7/#8/#9
- `pc_eventInstances` — **overrides per-instanță** pt. evenimente recurente (dată/nume/schedule/rooms modificate doar pentru o instanță, sau instanță ștearsă). ✅ #8
- `pc_eventTemplates` — șabloane de event (setări consistente); PCO avea 15. ✅ #8
- `pc_eventTimes` — blocuri de timp per event (setup/service/teardown): `{ eventId, name, startsAt(UTC), endsAt(UTC), showOnPublicFeed, showOnKiosk }`. ✅ #7/#9
- `pc_rooms` — `{ name, folderId, questions[] }`. ✅ #7
- `pc_resources` — `{ name, folderId, quantityTotal, questions[] }`. ✅ #7
- `pc_roomRequests` / `pc_resourceRequests` — `{ eventId, roomId/resourceId, quantity, roomSetupId?, answers[], approvalStatus, approvalGroupId }`. ✅ #7
- `pc_bookings` — rezervare fermă (request aprobat) legată de instanța de event: `{ requestId, roomId/resourceId, eventId, startsAt, endsAt, quantity }`. **Sursa pt. anti-double-booking.** ✅ #7
- `pc_approvalGroups` — `{ name, memberIds[] }` (≥1); asignabile la rooms/resources/calendars/forms. ✅ #7
- `pc_roomSetups` — configurații de aranjare sală. ✅ #7
- `pc_tagGroups` — `{ name, required (≥1/event), sortOrder, isCampusAuto }`. ✅ #7/#8
- `pc_tags` — `{ tagGroupId?, name, color, churchCenterCategory }` (sau „Individual"). ✅ #7/#8
- `pc_forms` (fost `pc_eventRequestForms`) — `{ name, type: eventRequest|…, defaultOwnerId, approvalGroupIds[], defaultCalendarId, description, allowRecurring, status: open|closed|archived, customReplyEmail, publicUrl }`. **Engine general.** ✅ #7/#8/#10
- `pc_formFields` — `{ formId, kind: eventTemplate|room|resource|checkboxes|date|dropdown|file|number|paragraph|sectionHeading|text, label, description, required, options[], allowMultiple, allowOther, sortOrder, condition:{ fieldId, equals } }`. ✅ #10
- `pc_formSubmissions` — `{ formId, submitterUserId?, answers[], createdEventId, status }`. ✅ #10
- `pc_automations` — `{ scope(formId/global), trigger: onSubmit|onApproved, filter:{fieldId,equals}?, action:{type: sendEmail|addToWorkflow|createTask|…, params}, enabled, ownerId }`. ✅ #10
- `pc_automationRuns` — istoric 32 zile: `{ automationId, subjectRef, status: success|pending|paused|failed|ignored, error?, ranAt }`. ✅ #10
- `pc_feeds` — **N/A** (Groups/Registrations nu există la noi); păstrăm iCal + `pc_connections`. ✅ #8
- `pc_connections` — **punte** event ↔ plan (Services) / alt produs: `{ sourceType, sourceId, targetType, targetId }`. ✅ #7
- **Legături approval group (M2M):** group ↔ rooms/resources/forms/calendars → `pc_approvalGroupAssignments`. ✅ #8

### 4.2quater Entități People (din bucata #11)
- `pc_people` — profil persoană (vezi §4.1). Sursa de adevăr pt. oameni. ✅ #11
- `pc_households` — `{ name, memberIds[], primaryContactPersonId }`. ✅ #11
- `pc_customTabs` — `{ name, sortOrder, collaborators[] }`. ✅ #11
- `pc_customFields` — `{ tabId, name, type, options[], sortOrder }`. ✅ #11
- `pc_customFieldValues` — `{ personId, fieldId, value }`. ✅ #11
- `pc_lists` — `{ name, rules:[{ match: all|any|none, conditions:[{ domain, field, op, value, include:bool, createdBy }] }], rulesMatch: all|any|none, resultsWillShow: exact|household*, refreshMode: auto(frecvență)|manual, campusId?, categoryId?, collaborators[], starredBy[], valid:bool }`. ✅ #11/#13
- `pc_workflows` — `{ name, steps[], permissions, campusId?, categoryId? }`. ✅ #11
- `pc_workflowCards` — `{ workflowId, personId, currentStepId, assigneeId, status, history[] }`. ✅ #11
- `pc_notes` — `{ personId, categoryId, date, content, authorId }`. ✅ #11
- `pc_noteCategories` — `{ name, collaborators[](view/create/manage), private, digestRecipients[] }`. ✅ #11
- `pc_membershipTypes` — tipuri de membru configurabile. ✅ #11
- `pc_imports` — job-uri CSV: `{ fileRef, mapping, status, createdCount, updatedCount, errors[], undoableUntil(48h) }`. ✅ #11
- `pc_duplicates` — perechi candidate de duplicat (detector) + acțiune merge. ✅ #11
- `pc_directoryListings` — ce alege fiecare persoană să partajeze în director + status (can-view/is-listed/declined). ✅ #11
- `pc_categories` — categorii pt. lists/workflows/forms. ✅ #11
- `pc_spamList` — emailuri blocate la submisii forms. ✅ #11
- `pc_emailSenders` — custom „from" senders (From name + reply-to verificat + collaborators) (§12). ✅ #11/#12
- `pc_activity` — feed de activitate per persoană (cross-feature), gated pe permisiuni. ✅ #12
- `pc_commHistory` — istoric comunicare (email/text/push) per persoană + status livrare (≥3 luni). Se leagă de `pc_emailLog`. ✅ #12
- **Ownership pe entități** (`ownerId` + „unassigned" recovery) pt. lists/workflows/automations/noteCategories/customTabs/forms — staff transition. ✅ #12
- **Note pe `pc_formFields`:** câmp `category: profile|workflow|basic` + `linkedField` (profile) / `linkedWorkflowId` (workflow). Forms engine = general (People + Calendar + orice). ✅ #12

### 4.3bis Entități Songs (CONFIRMATE #22)
- `pc_songs` — `{ title, ccli, authors[], copyrightYear, themes[], tagIds[] }`. ✅ #22
- `pc_arrangements` — `{ songId, name, lengthSec, bpm, meter, sequence:[labels], notes, albumArtFileId, tagIds[], archived }`. ✅ #22
- `pc_keys` — `{ arrangementId, startKey, endKey, description, capos[] }`. Fișiere atașate la arrangement (toate) SAU la key. ✅ #22
- `pc_chordCharts` — `{ arrangementId, chordProSource, originalKey, createPDFs:{ lyrics, number, numeral }, formatting }` → generează „Chord Chart in [Key]" PDF per key (NU ocupă storage; render ChordSheetJS→expo-print). ✅ #22
- `pc_audioTranspositions` — job queue DSP: `{ sourceFileId, fromKey, toKey, direction, status, resultFileId }`. ✅ #22
- (fișierele song/audio/link → prin `pc_files`, §4.2ter/#21)

### 4.x Relație „roster" (confirmat #2)
- Nu toți userii sunt „în Services". O persoană e în roster dacă e **membru al ≥1 echipe** (sau marcaj explicit). Modelăm prin apartenența la echipă (`pc_teamMembers`: `teamId`+`userId`+`roleInTeam`) — sursa de adevăr pentru „cine e programabil".

### 4.3 Convenții de schemă (toate colecțiile `pc_`)
- `createdAt` / `updatedAt` (timestamps).
- `schemaVersion` (pentru migrații aditive).
- **Soft-delete** (`deletedAt`) acolo unde ștergerea trebuie să fie reversibilă/auditabilă.
- Referințe prin `ObjectId` + index; fără date denormalizate care se pot desincroniza (sau, dacă denormalizăm pt. viteză, documentăm sursa de adevăr).

---

## 5. Roluri & permisiuni (capability + scope based) — MODEL COMPLET
> Cerința ta: la lansare DOAR 2 roluri (lider/membru), dar **STOCAREA** suportă modelul complet PCO ca să NU repictăm mai târziu. **Stocare bogată, UI simplu acum.**

### 5.1 Dimensiuni (din bucata #3) — permisiunea NU e un singur nivel
1. **People & Plans** — nivelul principal, **scoped per folder/service-type** (moștenire „Same As Parent").
2. **Song** — nivel separat (acces pagina Songs + create/edit/delete).
3. **Media** — nivel separat (acces pagina Media).
4. **File access** — flag-uri INDEPENDENTE de nivel: `plan` / `song` / `media` files. ⚠️ view ≠ download.
5. **Leadership pe echipă** — „teams they lead" (`pc_teamMembers.isLeader`); schedulerul acționează doar aici.
6. **LIVE** — capabilitate **DERIVATĂ** (view/control/take-control/reset) din nivelul People&Plans + leadership + org-defaults; seam pt. viitor (vezi §5.6).
7. **Chat** — capabilitate **DERIVATĂ** din nivelul People&Plans + leadership (vezi §5.6).
8. **Account** — orgAdmin (= super-admin existent).
9. **Calendar (dimensiuni proprii, din #7/#9):** niveluri separate pentru **Event**, **Rooms**, **Resources**, **People** + rolul **Conflict Resolver** (rezolvă conflicte; ≥1 admin trebuie să fie). Cei cu profil Calendar văd evenimentele **DOAR din calendarele la care au acces** (`pc_calendarAccess`, accessMode everyone/specific) — excepție admin (tot) + owner/manager/approver (eventul lor). **Accesul la calendar e un strat de scoping/privacy** peste niveluri.
→ Modelul `pc_permissions` e **extensibil pe dimensiuni** — Calendar adaugă cheile lui fără să rescrie nimic (dovada că modelul capability+scope era corect).

> **⚡ STORED vs DERIVED (confirmat de „Permisiuni Services complete", #Perm):** În popup-ul **Manage Permissions** din Services se setează DOAR **3 dropdown-uri stocate** (People&Plans, Song, Media) + **checkbox-uri file access** (Plan/Song/Media). Restul capabilităților (chat, LIVE, plan actions, scheduling, general) sunt **DERIVATE** la runtime din: nivelul stocat + „teams they lead" + **org-default settings** (`pc_servicesDefaults`). Fiecare **produs** își adaugă propriile dropdown-uri (Services: 3; Calendar: Event/Rooms/Resources/People + Conflict Resolver). → stocăm puțin, derivăm mult; UI simplu.

### 5.2 Niveluri (ordonate, moștenesc în sus)
`scheduledViewer` < `viewer` < `scheduler` < `editor` < `administrator` < `orgAdmin`
- **scheduledViewer:** doar My Schedule + planurile la care e programat (DUPĂ notificare). Nimic altceva.
- **viewer:** vede TOATE planurile + oamenii din echipele lui.
- **scheduler:** editează/programează DOAR pe echipele pe care le conduce; adaugă rehearsal/other times (NU service times); creează profile (după setări).
- **editor:** adaugă/editează TOATE planurile+oamenii; creează echipe; șterge ce a creat.
- **administrator:** tot + setări service type + editează permisiuni + reschedule + copy service type + integrări (CCLI/SongSelect).
- **orgAdmin:** orice + schimbă permisiunile default.
- **⚠️ Ladder-ul Song & Media e DIFERIT (#Perm):** `scheduledViewer < viewer < editor < administrator` — **FĂRĂ nivel „scheduler"**. (scheduledViewer = nu vede pagina Songs/Media în nav, dar vede/redă conținutul printr-un plan la care are acces; viewer = vede pagina, fără create/edit/delete; editor = creează + editează, șterge doar ce-a creat, are file access; administrator = editează/șterge tot (dacă org permite) + tag-uri + integrări terțe.)

### 5.3 „Highest permission"
Nivelul afișat în header/profil = **maximul pe toate folderele/service-type-urile**. Îl calculăm pentru check-uri globale + afișare.

### 5.4 Mapare la lansare (doar 2 roluri expuse în UI)
- `teamLeader` ≈ scheduler/editor pe echipele lui.
- `member` ≈ scheduledViewer/viewer.
→ În DB stocăm modelul complet (dimensiuni + scope), deci „adaug scheduler-only" sau „editor pe un folder" = **DATE, nu cod**.

### 5.5 Stocare (aditiv)
- `pc_permissions`: `{ userId, scope: "global"|"folder:<id>"|"serviceType:<id>", peoplePlansLevel, songLevel, mediaLevel, fileAccess:{plan,song,media} }` — moștenirea „same as parent" se rezolvă la citire.
  - **Scope & moștenire (#Perm):** nivelul se poate seta **per folder / per service-type**. `Same As Parent` = moștenește de la folderul părinte; dacă nu există părinte → **default la nivelul global People&Plans**. „Highest permission" (§5.3) = maximul pe toate scope-urile.
- `pc_teamMembers`: `{ teamId, userId, isLeader, roleInTeam }`.
- orgAdmin: flag app (super-admin). Billing manager PCO = **N/A**.

### 5.6 Matricea de capabilități (din „Permisiuni Services complete", #Perm) — sursa de adevăr pt. catalogul de capabilități
> Astea sunt DERIVATE din nivelul stocat (+ leadership + org-defaults). Le codăm ca **catalog de capabilități = DATE** (nu `if`-uri împrăștiate). `✓`=implicit, `*`=depinde de org-default (`pc_servicesDefaults`), scoped per service-type unde zice.
>
> **Legendă nivel:** SV=scheduledViewer, V=viewer, S=scheduler, E=editor, A=administrator, OA=orgAdmin.

**Navigare / global (după „highest permission"):**
| Capabilitate | SV | V | S | E | A |
|---|:--:|:--:|:--:|:--:|:--:|
| View My Schedule | ✓ | ✓ | ✓ | ✓ | ✓ |
| View plans (toate) | | ✓ | ✓ | ✓ | ✓ |
| Songs & Media libraries | | ✓ | ✓ | ✓ | ✓ |
| People pages | | * | * | ✓ | ✓ |
| Create/delete Service Types | | | | | ✓ |
| Create/Delete folders | | | | | * |

**People page / Profile:**
| Capabilitate | S | E | A |
|---|:--:|:--:|:--:|
| View People page | * | ✓ | ✓ |
| Remove „My Teams" filter | * | * | ✓ |
| Export People CSV | * | ✓ | ✓ |
| View emails trimise/primite în alte profile | ✓ | ✓ | ✓ |
| Create people | * | * | ✓ |
| Remove/archive people **pe care i-a creat** | | ✓ | ✓ |
| Remove/archive **orice** profil | | | * |
| Edit contact info | * | * | * |
| Edit people assignments | * | * | * |
| Edit/delete tags | | * | * |

**Songs / Media (ladder SV/V/E/A):**
| Capabilitate | SV | V | E | A |
|---|:--:|:--:|:--:|:--:|
| View/interact prin plan accesibil | ✓ | ✓ | ✓ | ✓ |
| Access pagina Songs/Media | | ✓ | ✓ | ✓ |
| Delete songs/arr/media **create de el** | | | ✓ | ✓ |
| Delete **orice** song/arr/media | | | | * |
| Archive & restore songs | | | ✓ | ✓ |
| Upload atașamente song/media | | | ✓ | ✓ |

**Chat (derivat din People&Plans):**
| Capabilitate | SV/V | S | E | A |
|---|:--:|:--:|:--:|:--:|
| Participă la chat-uri invitat | ✓ | ✓ | ✓ | ✓ |
| Creează chat pt. echipele conduse | | ✓ | ✓ | ✓ |
| Creează chat pt. orice echipă | | | ✓ | ✓ |
| Edit/delete propriile mesaje | ✓ | ✓ | ✓ | ✓ |
| Edit/delete mesajele membrilor echipei | | ✓ | ✓ | ✓ |
| *(DM-uri: dacă orgAdmin le activează, oricine poate scrie DM cuiva cu care împarte o echipă/grup, indiferent de nivel.)* | | | | |

**Service-type-scoped — Plans & Order of service (S/E/A):**
| Capabilitate | S | E | A |
|---|:--:|:--:|:--:|
| Add a plan | | ✓ | ✓ |
| Delete a plan | | ✓ | ✓ |
| Reschedule a plan | ✓ | ✓ | ✓ |
| Edit service order | | ✓ | ✓ |
| Edit **service time** | | ✓ | ✓ |
| Edit **Rehearsal/Other time** | ✓ | ✓ | ✓ |
| Add/edit/view plan notes | ✓ | ✓ | ✓ |
| Edit/import/export templates | ✓ *(doar people)* | ✓ | ✓ |
| Upload attachment | | ✓ | ✓ |

**Service-type-scoped — Scheduling & managing teams (S/E/A):**
| Capabilitate | S | E | A |
|---|:--:|:--:|:--:|
| Schedule echipele **conduse** | ✓ | ✓ | ✓ |
| Schedule echipele **ne-conduse** | | ✓ | ✓ |
| Edit statuses + remove membri (echipe conduse) | ✓ | ✓ | ✓ |
| Edit statuses + remove membri (echipe ne-conduse) | | * | * |
| Edit/delete echipe conduse | ✓ | ✓ | ✓ |
| Edit/delete echipe ne-conduse | | * | * |

*`*` la teams ne-conduse = **doar dacă are editor/administrator în TOATE service-type-urile echipei**.*

**Services LIVE (SEAM, amânat — modelăm capabilitatea, nu-l construim acum):**
| Capabilitate | SV | V | S | E | A |
|---|:--:|:--:|:--:|:--:|:--:|
| View LIVE | ✓ | ✓ | ✓ | ✓ | ✓ |
| Control LIVE | * | * | *(echipe conduse)* | ✓ | ✓ |
| Take control de la altcineva | | | | | ✓ |
| LIVE chat | * | ✓ | ✓ | ✓ | ✓ |
| Reset LIVE times | | | | | ✓ |

**General (după People&Plans level — A/OA):** Edit custom reports, Copy service type, Recover deleted service types, Restore archived service types, Edit permission levels, **Set file access** — toate `✓` pt. **administrator + orgAdmin**.

### 5.7 Org-default settings (`pc_servicesDefaults`) — ce înseamnă `*`
Toate `*`-urile de mai sus sunt **toggle-uri la nivel de organizație** (orgAdmin le schimbă). Modelăm explicit:
- `newUserDefaultLevel` (ce primește un om nou by default).
- `whoCanCreatePeople`: scheduler? editor? (altfel doar admin).
- `whoCanDeleteAnything`: doar creator vs și administrator (remove/archive orice profil/song/media).
- `whoCanEditContactInfo` / `whoCanEditAssignments`: scheduler/editor/admin.
- `whoCanCreateDeleteFolders`: administrator?
- `whoCanControlLive` (seam) + `whoCanRemoveMyTeamsFilter`.
- `directMessagesEnabled` (chat DM-uri).
→ **Checker-ul de permisiuni consultă MEREU: nivel stocat + leadership + `pc_servicesDefaults`** (server-side, invariant §1.4). La lansare punem default-uri rezonabile; orgAdmin le poate schimba (= date).

### 5.8 Manage Permissions — UI & notificări (#Perm)
- **Flux UI:** People → profil → **Actions** → **Manage permissions** → dropdown-uri per secțiune (People&Plans / Song / Media) → jos **checkbox-uri file access** (Plan/Song/Media, separat de nivel) → per folder/service-type: tab **Folders**, expand, dropdown cu opțiunea **Same As Parent** → **Update**. **Bulk edit** pt. mai mulți oameni odată. → la noi: ecran mobil echivalent (2 roluri expuse, dar popup-ul „avansat" scoate modelul complet).
- **Downgrade / scoatere acces:** ca să scoți complet accesul la Services → **arhivezi profilul**. Ca să limitezi → setezi **scheduledViewer** (nu vede nimic dacă nu e programat explicit).
- **📧 Notificări la schimbare de permisiuni (regulă fină):**
  - **Om nou** (n-a logat niciodată) primește acces → **email de welcome** (produse + niveluri + cum se loghează).
  - **Upgrade** → email („accesul s-a schimbat" + ce s-a mărit).
  - **Remove/downgrade** → **FĂRĂ email**, EXCEPȚIE: dacă se atinge un **orgAdmin** → **toți orgAdminii sunt notificați** (măsură de securitate anti-preluare profil).
  - La noi: push + email prin `emailService` (§12); regula de orgAdmin → leagă de `pc_auditLog`/securitate (§13).

---

## 6. Concurență, validare & performanță
- **Scrieri simultane:** operații atomice + **indici unici compuși** (ex: `pc_assignments` unic pe `planId + positionId + userId`) → imposibil de dublat sub race.
- **Strat de validare pluggable:** regulile de business se adaugă ca module, fără să atingi nucleul (tu mi le dai „as we go").
  - **Regula ta (2 enforcement-uri, #17):** (a) **scheduler programează pe cineva blocat** = WARNING (badge 🟥, poate forța — ca PCO); (b) **membru pune blockout peste o cerere PENDING** = **HARD BLOCK** (mai strict decât PCO). Verificare atomică server-side: la add blockout, caută `pc_assignments(personId, status=unconfirmed)` care intersectează → refuză cu mesaj clar. **Blockouts se aplică la TOATE echipele** (pt. o singură echipă → folosește preference „unavailable").
  - **Conflict-detection engine (#17):** conflict = suprapunere de **ore asignate** (`timeIds` din `pc_timeAssignments`) pe toate planurile unui om. 4 tipuri badge: preference/conflict/declined/blockout. Toate warnings (scheduler poate ignora).
  - **Auto-Scheduler (#14):** rulează pe `neededPositions` + `preferences`, EXCLUDE blockouts, evită suprascrierea assignment-urilor confirmate; propunere atomică + idempotentă. Candidat pt. AI (§10).
  - **Detectare conflicte** (confirmat #2): programările legate de **ore specifice** (`planTimes`) permit „omul e deja prins la ora X" + „e blocat la data Y". Verificare la assign.
  - **🚫 Anti-double-booking (Calendar, #7):** o cameră/resursă NU poate fi rezervată de două ori pe intervale care se suprapun. Verificare **atomică** la creare booking (interval-overlap pe `pc_bookings` filtrat pe room/resource + tz-aware), cu lock/tranzacție ca doi requesteri simultani să nu prindă același slot. Resursele cu cantitate → suma rezervată ≤ `quantityTotal`.
  - **Workflow aprobare pe 2 NIVELURI (state machine, #7/#8/#10):** pt. cereri din formular: owner **aplică** rooms/resources (stare „penciled-in" → abia apoi pleacă cererile; Approve blocat până la apply). Apoi: **event-level** (poate avea loc?) + **room/resource** (fiecare separat), **independente**. `pending → approved/rejected`. **Un singur aprobator din grup** schimbă starea (atomic, primul câștigă). Mai multe grupuri pe event → pending până răspund toate; orice reject = event rejected. Auto-approve pt. membru (excepție: forme publice). **Deciziile sunt ireversibile** (tranziție terminală). Emailuri + audit la fiecare pas.
  - **Conflicte booking:** dacă un event are conflict (room/resource dublu cerut), **cererile de aprobare se BLOCHEAZĂ** până rezolvă un **Conflict Resolver**. Conflict cross-calendar = vezi doar room-ul, nu detaliile celuilalt event (privacy). Activity loghează conflict creat/rezolvat.
  - **Reguli conflict (#9):** **🛑 Blockout pe room/resource câștigă automat** — bookingurile suprapuse sunt auto-respinse + email owner. Conflict resolver notificat **la 30 min** după creare (fereastră de ajustare → job întârziat). Rezolvare: give-to-A / give-to-B / **shared** (ambele folosesc room-ul — singura excepție intenționată de la anti-double-booking). Re-rezolvare = scoți+readaugi room (urmat de email manual).
  - **Tranziții aprobare la MUTARE calendar (#9):** required→no-approval = auto-approve; no→required = revine `pending`; required→required = aprobările grupurilor comune se păstrează, restul `pending`. Toggle-off „require approvals" pe un calendar = auto-aprobă toate pending.
- **Index-uri planificate (provizoriu):** `pc_plans(serviceTypeId, date)`, `pc_planTimes(planId)`, `pc_assignments(userId, status)`, `pc_assignments(planId)`, `pc_assignments(planId, positionId, userId)` **unic**, `pc_blockouts(userId, startDate, endDate)`, `pc_teamServiceTypes(serviceTypeId)`, `pc_bookings(roomId, startsAt, endsAt)` + `pc_bookings(resourceId, startsAt, endsAt)` (overlap/anti-double-booking), `pc_events(calendarId, …)`, `pc_connections(sourceType, sourceId)` + `(targetType, targetId)`.
- **Realtime:** calendar/order se actualizează live prin socket-ul existent (pattern pray-room).

---

## 7. Hartă UI / ecrane (în construcție)
*(se umple când trimiți screenshot-urile — UI/UX = IDENTIC cu PCO Services, mobile-only)*
- **📱 SHELL „APP-IN-APP" (CONFIRMAT user) — punctul de intrare al întregului modul:**
  - Tab-ul din footer **„Resurse" → redenumit „Planificare"**.
  - La tap pe „Planificare": **tab-bar-ul principal al app-ului dispare** și e înlocuit de **bottom nav-ul Planning Center**: **Schedule / Plans / Songs / Media / People** (ecranele din #24). Senzație de „app înăuntrul app-ului".
  - Navigator imbricat izolat (React Navigation nested) + buton clar de **ieșire** înapoi în app-ul principal.
  - **Mobile-only:** n-avem web → tot ce la PCO era „web-only" (creare media items, editare detalii media, creare tag-uri noi) **TREBUIE făcut pe mobil** la noi (vezi §9 `[MOBILE-WEBONLY]` = re-evaluat).
  - Respectă regulile tale mobile: FAB-uri peste bara de jos, keyboard-dismiss, safe-area.
- Secțiune „Planificare" (Planning Center) în app.
- **Pagina Plans** — planuri grupate pe service type (expandabil pe dată). (#2)
- **Pagina Plan** — 2 tab-uri: **Order** (ordinea) + **Teams** (programarea) + **Times**. (#2)
- **Pagina Songs** — bibliotecă (aranjamente, chord charts, audio). (#2)
- **Pagina Media** — slide-uri/video/curriculum. (#2)
- **Calendarul „programările mele"** (vedere derivată din assignments, per cont/rol) — ≠ produsul Calendar al PCO. *(de detaliat la bucata ta de calendar)*
- Capabilitate de **Search** (people/songs/media/teams/positions).
- **Toolbar** (#6): Profile (my profile / login settings / logout), Help, **Notificări (bell)**, **To-do/Tasks**, **Chat**.
- **Dashboards** (#6): tab-uri per campus + widgets (upcoming events / „Scheduled" chart / group events) — **seam**.
- **Puncte de intrare AI** (§10): unde punem un input/prompt de AI într-un tab (ex. buton „Întreabă AI" / „Generează cu AI") — plumbing gata, feature-urile se adaugă pe parcurs.
- **Calendar (#7):**
  - **Events** — 3 vederi: **Month** / **Table** / **Week** (view settings salvate per user; color by calendar/approval; density; tag dots; dim past; public-times-only; columns la Table).
  - **Pagina Event** — tab-uri: **Overview** (schedule + rooms&resources + tasks + tags), **Activity** (audit), **Files**, **Connections** (leagă de plan Services), **Settings**. Butoane: Edit/Duplicate/Delete/Review approvals/View on Church Center.
  - **People (Calendar)** — listă cu **column chooser** (First/Last/Email/Phone + Event/Rooms/Resources/People/Conflict Resolver = niveluri permisiuni).
  - **Approval groups** (tab pe People), **Rooms & Resources** (cu foldere, întrebări, detalii expiration/serial), **Event request forms** (publice).
- **Services (#14):**
  - **Plans** (grupate pe service type, în foldere) → **Plan page**: Order (items) + Teams (schedule) + Times + Files + Notes.
  - **Teams tab** → Team Actions (Add People / Import Template / Needed Positions / **Auto-Schedule**); goluri (needed) vizibile.
  - **📊 Matrix** — grilă multi-săptămână (planuri × oameni) pt. programare în masă + un singur email.
  - **Team page** (People→Teams): Members / Positions / Team leaders / Times & Preferences / Settings.
  - **My Schedule** (membru): accept/decline, sign-up poziții deschise, blockouts, preferences, program gospodărie, „Email My Leader".
  - **Rehearsal** (membru în echipă rehearsal): chord charts + MP3 + versuri derulabile.
  - **Approvals tab** (#8): 3 secțiuni — **Conflicts** (doar Conflict Resolver), **Event requests** (approve/reject event-level), **Booking requests** (approve/reject/selective pe rooms/resources).
  - **Event tabs:** Overview (schedule+rooms&resources+tasks, navighează instanțe recurente) / Activity (feed cu categorii + comentarii + email) / Files (atașamente, invizibile public) / Connections (widgets spre Services) / Settings (calendar/owner/managers/registration URL/summary/notes/Church Center image+visibility+description).
  - **Filtre** (bară, logică OR-în-grup / AND-între-grupuri) + **bulk edit** (table) + **duplicate** + **event templates** + **Settings > Tags / Calendars / View preferences / Import / Feeds / Event templates**.
  - **Față publică (membru/congregație)** (#9, imaginile 15-17): pagina publică de evenimente — toggle **List / Month / Gallery** (List mereu on; Month nu pe mobil), filtre **campus + categorie**, secțiune **Featured** + **Upcoming**, carduri cu imagine/dată/recurring/„Signups available". Vede DOAR published/featured.
  - **Sharing/output (seam-uri, §11):** print month, **iCal feed** (public-times vs full), **embed** (list/month/gallery), **kiosk** (TV, doar aprobate, 5min refresh, dark/light).
- **📱 Mobil (#24) — aceleași ecrane, nav jos:** **Schedule / Plans / Songs / Media / People** (+ Profile/Settings sus-dreapta). NU e o app separată — **aceeași arhitectură, aceleași API-uri**, doar layout mobil.
  - **My Schedule** = home membru (pending/confirmed/signup/blockouts + household switch + email leader).
  - **Media player** mobil (List/Song/Lyrics/Docs/Notes + loop + metronom + mini-player + download + CarPlay/Android Auto).
  - **Widgets** home-screen (Next Up / Rehearse / Scheduler / Schedule&Rehearse) = seam.
  - **Settings** (notificări per tip + badge mode + cached data + dark mode + privacy/terms).
  - Diferențe web-only by design: **creare media items**, **editare detalii media**, **creare tag-uri noi** = doar web; **scan document→OCR** = doar iOS.
- *(urmează: Order detaliat Services, Song view, Scheduling…)*

---

## 8. Întrebări deschise / de decis (as we go)
- ~~🔑 TENANCY~~ → **✅ CONFIRMAT (§14.6.A):** deployment-per-biserică (A) + **seam `orgId` pe fiecare document din zi 1** (invariant §1.13). **🔓 CONDIȚIA USERULUI: „portița" spre multi-tenant trebuie să rămână MEREU deschisă — să NU devină niciodată «imposibil».** → de-aia `orgId` e pe FIECARE document + scoping prin helper unic (nu scris de mână), ca activarea multi-tenant să fie flip-a-switch, nu rescriere.
- ~~🗄️ LAYOUT DB~~ → **✅ CONFIRMAT (§14.6.B):** aceeași bază + prefix `pc_` (reuse frictionless cu prayer rooms/users).
- ~~🎯 FELIA MVP~~ → **DECIS (§14.6.C):** NU facem MVP redus; facem TOT. „Ordine de construcție fără throwaway": People → Services core → Calendar → restul. La final = 100% tot, garantat.
- **📋 KEEP/DROP (§14.3):** cele 16 elemente bani/licențe/externe — zi-mi la fiecare păstrez/arunc. — *aștept răspunsul tău.*
- **📦 Storage (§14.5):** Cloudinary (existent) vs Cloudflare R2. — *de decis.*
- **🔗 Migrare `users`→`pc_people` (§14.5):** 1:1 la start? cine e prima persoană-admin? — *de confirmat.*
- **🌍 i18n (§14.5):** externalizăm textele din zi 1? (recomand DA) — *de confirmat.*
- **📈 Scală (§14.5):** plafon așteptat de oameni dacă dai app-ul altora? — *de confirmat.*
- ~~SCOPE Calendar~~ → **REZOLVAT**: Calendar E în scope (Services + People + Calendar = cele 3).
- ~~Roster~~ → **rezolvat #2** (`pc_teamMembers`). ~~Media vs songs~~ → **rezolvat #2**.
- ~~Offline: membrii își văd programările fără net?~~ → **REZOLVAT #24**: DA. PCO cache-uiește audio **30z după data planului** + clear manual. La noi: cache client-side (My Schedule + media), TTL legat de data planului, manifest în `pc_mediaPlaybackState`; fișierele NU în DB.
- **CarPlay / Android Auto** (#24) — redare audio în mașină la rehearsal. Seam nice-to-have — la lansare sau faza 2? — *de decis.*
- **Widgets home-screen** (#24, Next Up/Rehearse/Scheduler) — seam. La lansare sau faza 2? — *de decis.*
- Fusuri orare (toți în RO? multi-campus?) — *de confirmat.*
- „Needed positions" — câți per poziție per plan; afișăm goluri neacoperite? — *de confirmat la Scheduling.*
- Integrări terțe (CCLI/SongSelect, MultiTracks, PraiseCharts) — le vrem sau nu? (menționate la permisiuni admin) — *de decis.*
- Services **LIVE** (control în timp real al serviciului) — în scope sau seam pt. viitor? — *de decis.*
- Adâncimea folderelor (arbore nelimitat vs 1 nivel) — *de confirmat.*
- **Email — alegere provider:** SES (cel mai ieftin la volum, ~$0.10/1000) vs Resend/SendGrid (DX mai ușor). Recomand **SES** pt. „oricâte, ieftin". Trebuie domeniu de trimitere + SPF/DKIM/DMARC. — *de decis.*
- **AI — provider & model default:** Claude API (suntem pe Claude). Buget/limite per org/feature? — *rafinăm când definești primul feature AI.*
- **API public — primii consumatori?** (site, alt sistem, Zapier/Make…) — *de decis când apare nevoia.*
- Dashboards/widgets — în scope la lansare sau seam? — *de decis.*
- **Calendar — ce intră la lansare?** Rooms/resources + bookings + anti-double-booking (core) DA; dar: **event request forms publice**, **multiple calendars**, **iCal import/export**, **kiosks**, **reporting Liquid** — care la lansare, care seam? — *de decis.*
- **Views calendar** — Month+Table+Week toate, sau începem cu una? (mobil: Month+listă probabil suficient) — *de confirmat.*
- **Calendar start day** — RO = **Luni** (confirm?). — *de confirmat.*
- **Publicare evenimente** (vizibilitate publică / Church Center-like / iCal feed) — folosim §11 (API public) pentru feed-uri? — *de decis.*
- **Event templates** (#8) — în scope la lansare sau seam? — *de decis.*
- **Recurență + excepții per-instanță** (#8) — zona cea mai grea tehnic; confirmăm formatul (RRULE/iCal standard) + câte opțiuni de editare (this / this+future / all). — *de confirmat.*
- ~~Feeds Groups/Registrations~~ → **N/A** (produse inexistente la noi); păstrăm iCal + connections interne.
- **Output la lansare (#9):** față publică (List/Month/Gallery) = probabil DA (avem „two faces"). iCal feed / embed / kiosk / print = seam-uri — care la lansare? — *de decis.*
- **Acces per-calendar** (#9) — confirmăm că vrem calendare private cu listă de acces (ex. „staff only")? — *de confirmat.*
- **Form engine (#10)** — la lansare vrem formulare publice de cerere eveniment? Și îl facem generic (reutilizabil pt. alte formulare)? — *de decis.*
- **Automations (#10)** — engine-ul de automatizări la lansare sau seam? (event-bus-ul îl punem oricum din start) — *de decis.*
- **Payments** (taxă pe cerere, ex. nuntă) — vrem? ce provider? — *de decis (seam).*
- **People la lansare (#11):** profil+households+CSV import = core DA. Dar: **lists** (segmentare), **workflows** (pipeline), **custom fields**, **directory**, **notes** — care la lansare, care seam? — *de decis.*
- **Legătura `pc_people` ↔ `users` existent** — migrăm userii actuali în `pc_people` (1:1) la start? — *de confirmat (decizie de migrare).*
- **Background checks** (voluntari) — vrem? Checkr (plătit) sau manual? — *de decis.*
- ~~Promote grades~~ → **N/A** (Check-Ins/kids), dar păstrăm câmpul grade.
- **Prayer requests** din Notes — le legăm de modulul de rugăciune existent? — *de confirmat (sinergie).*
- **Services la lansare (#14):** scheduling manual + accept/decline + blockouts = core. Dar: **Auto-Scheduler**, **Matrix**, **scheduling templates**, **needed positions** — care la lansare, care seam? — *de decis.*
- **Auto-Scheduler = AI sau algoritm clasic?** (sau ambele — algoritm + opțiune AI) — *de decis la implementare.*
- **Services LIVE** (control serviciu în timp real) — în scope sau seam? — *de decis (detaliem la bucata LIVE).*
- **Echipe speciale (#15)** — secure (bg-check) / split / tag / backup — care la lansare? (split e cel mai complex) — *de decis.*
- **Public View / Schedule Publish** (planuri publice) — vrem planuri vizibile public în app? — *de decis (se leagă de față publică + §11).*
- **Attendance în Services** (prezență) — o vrem? (se suprapune cu „prayed/served" existent?) — *de confirmat.*
- **Transpunere audio (#22)** — PCO o face server-side (DSP, cu quality caveat). La lansare: o facem (ffmpeg/rubberband + queue) SAU doar pitch la redare? Recomand: **chord transpose DA la lansare** (ușor, valoros), **audio transpose = faza 2** (shift-uri mici). — *de decis.*
- **Integrări import (SongSelect/PraiseCharts/MultiTracks)** — le vrem ca import, sau doar editorul propriu? (CCLI SongSelect cere abonament) — *de decis.*
- **⚠️ MultiTracks API (#23, PRIORITAR — plătiți mult):** are MultiTracks **API/OAuth public pentru terți** sau e exclusiv PCO? **De cercetat / contactat MultiTracks.** Decide feasibility: integrare reală vs fallback (upload manual stems + editor propriu). — *de rezolvat devreme.*
- **Check-Ins** (prezență voluntari la intrare) — vrem un modul de check-in sau doar attendance manual? — *de decis.*

---

## 9. NOTES SPECIALE PENTRU UI (ca să NU uităm nimic)
> Reguli care „există dar le uităm când facem UI-ul". Se completează pe parcurs. Cerere explicită user.

### Permisiuni → UI (bucata #3)
- **[NAV]** Vizibilitatea din meniu depinde de permisiune: paginile **Songs / Media / People** NU apar pentru `scheduledViewer`. „My Schedule" apare pentru toți.
- **[SCHED-VIEWER]** `scheduledViewer` vede un plan DOAR după ce s-a trimis notificarea — nu înainte. (logică + UI)
- **[TEAM-SCOPE]** Pentru `scheduler`, butoanele de programare/editare sunt active DOAR pe echipele pe care le conduce; pe restul = ascunse/disabled.
- **[TIMES]** `scheduler` adaugă rehearsal/other times, dar NU service times (doar editor/admin) → ascunde „add service time" pt. scheduler.
- **[FILE-ACCESS]** ⚠️ Accesul la fișiere e SEPARAT de nivel. „Vede planul" ≠ „poate descărca chart/audio". Verifică flag-ul de file access înainte să arăți butonul download.
- **[PERM-EDITOR]** Editorul de permisiuni = arbore folder/service-type + dropdown per nivel + opțiune „Same As Parent".
- **[HIGHEST]** Afișează „highest permission" în header-ul profilului.
- **[NOTIF]** Upgrade permisiuni → notifică persoana (push). Scoatere orgAdmin → notifică TOȚI orgAdminii (securitate).
- **[ARCHIVE]** Blocarea totală a accesului la Services = arhivarea profilului (nu există „fără acces"); `scheduledViewer` = minim.
- **[ADMIN≥2]** Nu permite rămânerea fără orgAdmin (minim 2) — validare + UI.

### Localization & multi-campus (bucata #4)
- **[TZ]** Afișează mereu datele/orele în tz-ul campusului (default RO). Selector de campus unde contează. Format implicit **24h + ZZ/LL/AAAA**.
- **[CAMPUS]** Programările/planurile arată ora corectă pentru filiala lor, nu a device-ului. Conflicte calculate cross-timezone.
- **[LOGO]** Suport logo **light + dark** (avem deja teme light/dark).
- **[NOTIF-CENTER]** Centru de notificări (bell) cross-feature: mark read/unread, filtrare — refolosim ce avem.

### Security / AI / Toolbar (bucata #5/#6)
- **[PRIVACY]** Privacy mode ON by default → datele de contact ale membrilor NU sunt vizibile în directory fără drept. Verifică la fiecare afișare de contact.
- **[INACTIVE]** „Blochează/suspectez" = marchează **inactive cu motiv**, NU delete (păstrăm dovada). Buton „Inactivează", nu „Șterge", pe profil.
- **[IDENTITY]** Schimbarea email/telefon al altcuiva = necesită verificare identitate / confirmare (anti-impersonare). Fluxul nu e „edit direct" pentru admin.
- **[RISK]** Pe cereri (join echipă / acces) suspecte → banner de risc („atenție" / „risc mare"). Seam de scoring.
- **[AI-ENTRY]** Oriunde punem AI: input/prompt + stare loading + **confirmare umană** înainte de acțiuni cu efect (AI propune, userul confirmă). Afișează că e AI.
- **[AI-PERM]** AI vede/acționează DOAR în limita permisiunilor userului curent. Niciodată „mai mult decât userul".
- **[TASKS]** O notificare poate fi convertită în task (to-do). Tab To-do în toolbar.
- **[EMAIL-UNSUB]** Email bulk → link de dezabonare + respectă consimțământ (GDPR).

### Calendar (bucata #7)
- **[WARN-ICONS]** Lângă evenimente: ⚠️ galben = pending aprobare (event sau room/resource), ❗roșu = respins (event sau ≥1 room/resource respins). Consistent în toate vederile.
- **[CAL-COLOR]** Linia de culoare din stânga eventului = calendarul din care face parte. Opțiune „color by approval status".
- **[START-DAY]** Prima zi a săptămânii Sun/Mon = setare org (RO probabil Luni). Se aplică peste tot.
- **[PUBLISHED]** Published/Unpublished controlează vizibilitatea publică (iconul ochi). Nu afișa public ce e unpublished.
- **[EMAIL-PREFS]** Preferințe email per user, granular pe tipuri (approval/event activity, comments, new conflicts, new events). Unele FORȚATE (upgrade permisiuni, acces calendar). Opt-out email ⇒ tot apare în toolbar/notificări.
- **[CONFLICT-RESOLVER]** Rol special „Conflict Resolver" — ≥1 admin trebuie să-l aibă; UI de rezolvare conflicte booking.
- **[APPROVE-1]** Un singur aprobator din approval group e suficient → UI arată „aprobat de X", nu cere toți.
- **[OVERALL-TIME]** Un event arată și „Overall time" (de la primul setup la ultimul teardown) pe lângă blocurile individuale.
- **[VIEW-PERSIST]** Setările de vedere (Month/Table/Week, density, columns) + **filtrele** se salvează per user, nu global.
- **[REQUIRED-TAGS]** Tag group marcat Required → la crearea eventului trebuie ales ≥1 tag din el (asterisc roșu). Blochează save-ul altfel.
- **[TAG-COLOR]** Tag-urile au culoare (folosite la tag dots + highlight). Campus tags = auto + mereu publice.
- **[CC-CATEGORY]** Doar tag-urile marcate „Church Center category" apar ca filtre publice. Icon verde=activ, gri=nu.
- **[FILTER-LOGIC]** La filtrare: același grup = OR, grupuri diferite = AND. Trebuie comunicat vizual userului (altfel se miră de rezultate).
- **[VISIBILITY-3]** Vizibilitate = **Unpublished / Published / Featured** (3 stări). Unpublished poate apărea totuși în iCal feed, dar NU pe pagina publică.
- **[RECUR-EDIT]** La editarea unui event recurent întreabă mereu: „doar data asta" / „asta + viitoare" / „toate". Instanța unică = câmpuri limitate.
- **[APPROVE-IRREVERSIBLE]** Approve/Reject nu se pot anula → confirmă înainte („Ești sigur? Nu se poate reveni").
- **[CONFLICT-FIRST]** Dacă un event are conflict, nu trimite cereri de aprobare până nu se rezolvă; arată clar starea „în conflict".
- **[FILES-PRIVATE]** Fișierele atașate la event NU sunt publice nici când eventul e published.
- **[DUPLICATE]** Duplicate copiază tot + retrimite booking requests (nu sunt auto-aprobate).
- **[CAL-ACCESS]** Evenimentele dintr-un calendar privat NU apar nicăieri pt. cine n-are acces (nici în search/filtre) — excepție admin + owner/manager/approver. Verifică la fiecare listare/căutare.
- **[LINK-ONLY]** Event „link-only" = published dar nelistat public; accesibil doar cu URL. Buton „Copy link".
- **[BLOCKOUT-WINS]** Nu lăsa să ceri un room blocat; la blockout nou, respinge automat bookingurile suprapuse + notifică.
- **[SHARED-ROOM]** După rezolvare „shared", arată banner albastru pe ambele evenimente.
- **[CAL-MOVE]** La mutarea unui event în alt calendar, avertizează că statusul de aprobare se poate schimba (pending/auto-approve).
- **[KIOSK-APPROVED]** Kiosk + feed-uri publice arată DOAR evenimente complet aprobate.
- **[PUBLIC-VIEWS]** Față publică: List mereu disponibil; **Month NU pe mobil** (doar List); Gallery = thumbnails, recurring arată doar instanța următoare.

### Forms & Automations (bucata #10)
- **[FORM-BUILDER]** Builder cu drag-drop + tipuri de câmpuri + required + **logică condițională** (arată câmp doar dacă...). Preview public separat de editare.
- **[FORM-XOR]** Un formular are Event Template field SAU Room/Resource field, nu ambele.
- **[APPLY-FIRST]** Pe un event din formular, butonul Approve e **dezactivat** până owner-ul face „Apply & Edit" pe rooms/resources (stare penciled-in). Arată mesajul clar.
- **[FORM-STATUS]** Open (acceptă) / Closed (nu, dar păstrează pending) / Archived (respinge pending). Link închis → mesaj „nu acceptă submisii".
- **[REJECT-FINAL]** Reject event = ireversibil → requester-ul trebuie să re-trimită (ca să rămână legat de emailul lui).
- **[AUTO-STATUS]** Automatizările arată status (Success/Pending/Paused/Failed) + retry; owner-ul e notificat la fail.

### People (bucata #11)
- **[IMPORT-PREVIEW]** Importul CSV arată MEREU un preview (new/updated/errors/identical) înainte de commit + „undo 48h". Nu scrie nimic fără confirmare.
- **[REMOTE-ID]** Folosește `remote_id` pt. update fără duplicate; fără el, potrivire pe nume+email (riscă duplicate).
- **[ORGADMIN-CSV]** Profilul unui org-admin NU se poate modifica prin CSV (securitate) — arată skip clar.
- **[PROFILE-NO-LOGIN]** Un profil poate exista fără cont de login (copil, importat). UI-ul nu presupune că „persoană = user logat".
- **[CHILD-ADULT]** Copilul nu-și poate schimba contactul; household-ul îi gestionează programul. Reflectă în UI.
- **[CUSTOM-HIDDEN]** Dacă userul nu e collaborator pe un tab custom, arată „[hidden content]", nu valoarea.
- **[DIR-SHARING]** În director, fiecare alege ce partajează; respectă can-view/is-listed/declined. Nu expune contact fără consimțământ.
- **[MEDICAL-HIPAA]** Datele medicale = sensibile; acces restrâns + nu le loga/expune.
- **[DUP-MERGE]** La merge: păstrează ambele emailuri, alege primary, păstrează numele cum le-a scris persoana.
- **[INACTIVE-CASCADE]** La „inactivare": scoate din echipe Services + declină planuri viitoare + scoate din directory. Arată userului ce se întâmplă înainte de confirmare.
- **[GDPR-ERASE]** Permite ștergerea punctuală a unui email/telefon/adresă (GDPR) păstrând profilul pt. istoric.
- **[CHAT-13]** Chat (Services/Groups) restrâns la 13+; cei fără an de naștere nu pot participa.
- **[FORM-FIELD-CAT]** La builder: câmpurile sunt profile/workflow/basic; email NU se updatează prin form (previne duplicat).
- **[UNSUB]** Dezabonat email/SMS → nu mai primește; icon pe profil; resubscribe doar prin link/START (nu forțat de admin).
- **[OWNERSHIP]** Fiecare list/workflow/form/automation are owner; la plecarea cuiva → vederi „Unassigned" pt. revendicare (nu se pierd).
- **[PRIMARY-CONTACT]** Marcarea email/telefon primary (steluță) + verificare identitate la schimbarea contactului altcuiva.
- **[LIST-LOGIC]** Builder de liste: arată clar all/any/none + include/exclude + expansiunea household (rezultatele pot include rude). Altfel userul nu înțelege rezultatele.
- **[PLAYLIST]** „Playlist mode" = navighezi profil-cu-profil dintr-o listă (next/prev) pt. editări rapide (ex: profile cleanup).
- **[NEEDS-ATTENTION]** Listele cu condiții invalide apar în „Needs attention"; semnalează-le, nu le rula tăcut.

### Services (bucata #14)
- **[SCHED-NOTIFY]** Membrul (scheduled viewer) vede planul DOAR după ce i s-a trimis notificarea de programare — nu înainte.
- **[REHEARSAL-FILES]** Echipă rehearsal → arată chord charts + MP3 + versuri. Echipă non-rehearsal → doar files. Nu amesteca.
- **[ACCEPT-DECLINE]** Cererea de slujire = accept/decline clar; decline → oferă liderului re-programare.
- **[SIGNUP-OPEN]** Pozițiile „needed" neacoperite = vizibile ca „open", membrii se pot înscrie singuri.
- **[AUTO-SCHED-REVIEW]** Auto-scheduler PROPUNE; schedulerul confirmă înainte de a trimite notificările (human-in-the-loop).
- **[MATRIX-ONE-EMAIL]** Din matrix, trimite UN email cu toate cererile pe interval (nu spam-ui membrul cu un email per plan).
- **[LEADER-SCOPE]** Liderul/schedulerul acționează DOAR pe echipele lui (confirmă [TEAM-SCOPE]).

### Services — Plan page UI (bucata #15, din screenshot-uri — referință vizuală)
- **[PLAN-HEADER]** Titlu plan (ex. „Contemporary Service") + ‹ › navigare între planuri + dată (Apr 13) + meniu „…" (rename, print report, Services LIVE, Music Stand, copy link). Serie+artwork sus-stânga.
- **[PLAN-TABS]** 5 tab-uri: **Order / Teams / Times / Notes / Files**. Butoane rapide: Play / Print / Live.
- **[ORDER-UI]** Listă cu coloana de timp (toggle: oră specifică vs lungime min) + **section headers** gri (PRE-SERVICE MEDIA, PRAISE & WORSHIP…) + badge colorat pe item (M=media, literă=tonalitate cântec ex. C/D) + **avatar item leader** lângă item + FAB „+" jos-dreapta + drag-drop reordonare.
- **[TEAMS-UI]** „MY TEAMS" / „OTHER TEAMS"; per echipă contoare **✓confirmat ✗declined ?unconfirmed**; poziții (SOLOIST/WORSHIP LEADER/...) cu membri; bifă verde la confirmat; declined = **tăiat**; „**Needed**" = buton portocaliu cu cifră. Butoane „Email or Text" / „Chat".
- **[TIMES-UI]** Secțiuni SERVICE / REHEARSAL / OTHER times; fiecare cu zi color-coded (SUN verde, THU roz) + interval + dată; „Show times for other teams"; „Add".
- **[NOTES-UI]** Note grupate pe **categorie** (CHOIR/MUSIC/PASSAGES TO USE), fiecare asignabilă la echipe.
- **[FILES-UI]** Grupate pe **SERVICE TYPE / PLAN / per-cântec**; pt. cântec → **track-uri per instrument** (Bass.m4a, Guitar AG.m4a, Keys.m4a, Original Mix) + link streaming (Apple Music). Butoane Play / Music Stand.

### Services — Scheduling (bucata #17)
- **[CONFLICT-BADGE]** Lângă fiecare om la programare: 🟢 preferat / 🟠 nepreferat / 🟨 conflict / 🟥 blockout-sau-declined. Hover → detalii + motiv. Toate = warnings, nu blocaje (scheduler poate forța).
- **[SORT-NO-CONFLICT]** La alegerea pt. o poziție needed, afișează întâi oamenii FĂRĂ conflict + cei programați cel mai demult.
- **[AUTO-UNDO]** După auto-schedule, oferă „Undo" cât timp e pe pagină/matrix; explică cine a fost ales și de ce.
- **[PREPARED]** Membru „prepared" nu vede planul până nu trimiți emailul — marchează clar „prepared" vs „trimis".
- **[DECLINE-REPLACE]** La decline cu replacement activat: membrul alege înlocuitor → acela devine CONFIRMAT automat; cere confirmarea „am vorbit cu el".
- **[BLOCKOUT-ALL-TEAMS]** Blockout = pt. TOATE echipele; pt. o singură echipă → „unavailable" în preferences. Comunică diferența.
- **[MY-SCHEDULE]** Secțiuni Pending / Confirmed / Blockouts + Signup Sheets + Email Leader; accept/decline (all sau split per poziție/oră); household switch.
- **[SONGBOOK]** Buton „Songbook" = PDF compilat (chord charts/lyrics selectate) respectând file-access-ul userului.
- **[SCHED-EMAIL-UI]** (din screenshot #18, cerut de user) Emailul de programare: salut „Hi [Nume]," → „You have been placed on the schedule..." → per dată: **data mare** + service type + link albastru **„View plan"** → **box gri cu poziția** (ex. „Video Switcher (Tech)") → rânduri cu orele: **Service: 10/26 at 11:00A**, **Worship Runthrough: 10/24 at 7:30P** → butoane mari **Accept** (verde) / **Decline** (roșu) → semnătura (persoana Replies-To + biserica) → footer brand. La noi: push + ecran in-app echivalent cu Accept/Decline.
- **[REPLIES-TO]** Semnătura + destinatarul răspunsurilor = „Replies To" al echipei (Current Scheduler / All Leaders / persoană). Setează-l conștient (altfel semnătură greșită).
- **[PARENT-COPY]** Pt. copii: opțiune „copiază emailurile către adulții gospodăriei".
- **[MY-SCHEDULE-UI]** (screenshot #20) My Schedule: calendar lunar stânga + butoane **Block Out Dates / My Messages / Email My Leader** + secțiune **Signup Sheets** (badge „New" + „Sign up") + **Pending** (contor + „Accept all") cu carduri (dată, service type, poziție+ministry, ore, „Accept or Decline") + listă pe zile. Badge „?" portocaliu = unconfirmed.
- **[TEAM-ACTIONS-UI]** (screenshot mobil #20) Pe plan → Teams → săgeată pe echipă = meniu: **Add People / Import Template / Needed Positions / Email or Text / Chat / Take Attendance**. Nav jos: Schedule / Plans / Songs / Media / People.
- **[TEAM-TYPE-ICONS]** În lista de echipe, iconuri: difuzor=rehearsal, scut=secure, săgeată-split=split, tag=tag team.

### Files & Media UI (bucata #21, din screenshot-uri)
- **[VIDEO-LINK]** „Add a file" → „Select from video services" (YouTube/Vimeo) cu **search** (nu paste) + rezultate cu thumbnail + „+" de adăugare.
- **[TEXT-DOC]** „Text document": File name + editor rich-text (bold/italic/liste/aliniere/culoare/link/source) + Tags + checkbox „Import to item details".
- **[MEDIA-FILTER-ANDOR]** (imaginea cu AND/OR) Media: filtru **Content** AND filtru **Type**; în același filtru valori multiple = **OR** (Image, Video), între filtre = **AND**. Afișează vizual logica.
- **[LICENSE-EMAIL]** Email săptămânal de overage: „ai atins/depășit nr. de licențe pt. [fișier] — X over" + buton „Update Licenses". La noi: notificare + ecran de update licențe.
- **[FILE-VISIBILITY]** Fișierele asignate poziției = **bold + auto-selectate** (Music Stand/media player/songbook); cele neasignate = **gri** dar accesibile (pt. viewer+).

### Songs & Transpunere UI (bucata #22, din screenshot-uri)
- **[SONG-PAGE]** Pagina cântec: titlu + **CCLI# + autori + © + themes** sus; stânga = „All Arrangements" + listă aranjamente (+Add, Show Archived); dreapta = aranjamentul selectat cu **album art + Length/BPM/Meter + Sequence** + Files + butoane duplicate/archive/delete.
- **[FILES-COLUMNS]** Files afișate pe coloane: **Arrangement** (fișiere comune: Album Art, Lyrics, Spotify, Vimeo, Original Mix) + câte o coloană per **Key** (ex. „Chord Chart in Ab"). Jos: tab-uri de chei (Arrangement / C / Db / D / E / G / Add Key).
- **[TRANSPOSE-ICON]** Lângă „Files" + butonul **notă muzicală** = transpunere (chord chart generat SAU audio). Dacă lipsește iconul pe un fișier → nu e făcut în editor, nu se poate transpune.
- **[CHORDPRO-SHIFT]** Arată diferența: fără ChordPro acordurile se **shiftează** la transpunere; cu `[C]` rămân fixe pe silabe.
- **[SONG-FILTER]** Filter Songs: Type (OR în grup) AND alt filtru (ex. Sunday Service); coloane cu iconuri PDF/audio/chord/doc + BPM + Keys + Last Scheduled + Created.
- **[TAGS-PAGE]** Tags cu tab-uri **Song / Arrangement / Media / People / File** + „Filter by folder" + grupuri (Ministry/Speed/Style) cu „Add tag" / „Add Tag Group".
- **[MOBILE-NAV]** Nav jos Services mobil: **Schedule / Plans / Songs / Media / People**; Songs cu search + filter + sort + FAB „+".

### Services Mobile UI (bucata #24, din screenshot-uri)
- **[MOBILE-PLAYER]** Media player: tab-uri **List / Song / Lyrics / Docs / Notes**; ▶️ sus-stânga pe plan → player; **swipe-left pe fișier = Skip** (gri, reținut); **loop** cu handles pe timeline (pozițiile reținute per cântec); **metronom** jos; **mini-player** jos la ieșire (tap=full, swipe-left+X=close); iconul profilului tău lângă cântecul pe care-l conduci. **Skip/loop se sincronizează web↔mobil** (`pc_mediaPlaybackState`).
- **[MOBILE-DOWNLOAD]** „Download playlist" (3-dot per cântec → alegi fișierele, ✅ = incluse). Cache **până la 30z după data planului**; Settings→Cached Data→Reset. Banner „ai schimbat planul" → Switch/Dismiss playlist.
- **[MOBILE-OFFLINE]** My Schedule + media descărcată trebuie să funcționeze **fără net** (membrul repetă în mașină/offline). Cache local, TTL legat de plan.
- **[MOBILE-ACCEPT]** My Schedule: card cerere cu **data mare + service type + poziție+ministry + ore** → **Accept** (verde) / **Decline** (roșu); **Accept All** (contor); **Split** (per poziție); **accept per oră** (mai multe Service Times); badge **„?" portocaliu** = unconfirmed. Household switch pe iconul profilului; **Block Out Dates / My Messages / Email My Leader** sus; **Signup Sheets** cu badge „New".
- **[MOBILE-SCAN]** (⚠️ iOS only) Add a file → **Scan a Document** → camera → PDF multi-pagină → toggle **„Import Text into Lyrics & Chords"** = OCR → verifică textul în editor după upload. Android nu are scan.
- **[MOBILE-ADDFILE]** „Attach To" afișat mereu (media item / song / arrangement / cheie). „Copy to Services" din share-sheet extern. Swipe pe atașament = edit/delete. Doar admin/editor upload; editor șterge doar ce-a urcat.
- **[MOBILE-TEAMS]** Plan→Teams: **My Teams / All Teams** (unele permisiuni n-au All Teams → mesaj „contact leader"); **+** = needed positions (+/−) / schedule person / import template; envelope = email/text echipă; tap pe nume = email/text/call individual.
- **[MOBILE-WIDGETS]** (seam) Widget-uri: **Next Up** (accept/decline din widget), **Rehearse** (cântece+chei→player), **Scheduler** (lideri: ?→✓ + text message), **Schedule & Rehearse**. Small widget iOS = one-tap; tap&hold = editează ce afișează.
- **[MOBILE-NOTIF]** Settings→Notifications: **Team and schedule** + **Chat conversations** (per-team); toggle push per tip; **badge** = unread SAU pending (alegere); SMS=N/A. (PCO alege „preferred app" — la noi N/A, o singură app.) LIVE push cât timp LIVE e deschis.
- **[MOBILE-WEBONLY → RE-EVALUAT]** ⚠️ La PCO astea erau web-only (creare media items, editare detalii media, creare tag-uri noi). **La noi app-ul e MOBILE-ONLY → TOATE trebuie făcute pe mobil** (n-avem web unde să trimitem userul). Deci construim ecranele complete de creare/editare pe mobil, nu mesaje „se face pe web".
- **[FAB-BOTTOM-BAR]** (regula ta mobilă) FAB-urile „+" și butoanele de acțiune (Accept/Decline/Submit) se ridică peste bara de jos (nav + mini-player), nu lipite jos.

### 🎨 Temă PCO (tokens — IDENTIC cu screenshot-urile userului)
> Modulul are **tema lui proprie** (nu moștenește tema app-ului), ca să arate exact ca PCO. Tokens în `app/planning-center/theme/`.
- **Fundaluri:** screen `#0E0E0E` (near-black), header `#000000`, card/row `#1A1A1A`–`#1E1E1E`, bottom-sheet `#1C1C1C`, input `#1E1E1E`.
- **Verde PCO (primary/accent):** ~`#86C440` (tab activ, checkmarks, butoane-text, iconuri active, linkuri). *(se calibrează exact din screenshot la build.)*
- **Portocaliu (badge/unconfirmed):** ~`#F5A623` (badge „?", contor unread, dot necitit).
- **Text:** primary `#FFFFFF`, secondary/muted `#9A9A9A`, divider `#262626`.
- **Chip:** outline `#3A3A3A` + bg transparent; selectat = border verde.
- **Tab bar activ:** text verde + icon verde + „pill" verde-închis translucid în spatele iconului.

### 👤 People — ecrane IDENTICE cu screenshot-urile (felia de build 1)
- **[PEOPLE-LIST]** Header negru: titlu „People" stânga; dreapta iconuri **chat** (bulă verde-outline), **bell** (verde + dot portocaliu), **avatar** user. Sub el: **search bar** rotunjit (lupă verde, placeholder „Search People"). Rând: chip **„My Teams"** (pill cu border) + buton **„+"** verde (deschide Filter). Apoi **„258 Results"** stânga + icon **sort** (verde) dreapta. Listă: rând = avatar (poză sau cerc cu inițiale) + nume (ex. „Abel Cretu-Catanoiu (1)"), divider între rânduri. Infinite scroll/paginare.
- **[PEOPLE-SORT]** Dropdown: **SORT BY** First Name / Last Name (check verde pe activ) · **SORT DIRECTION** A-Z / Z-A.
- **[PEOPLE-FILTER]** Bottom-sheet „Filter" cu „N Results" + **RESET** (verde) + X. Tab-uri: **TEAMS / TAGS / PERMISSIONS** (underline verde pe activ).
  - **TEAMS:** sub-toggle **Teams / Positions**; dropdown **My Teams**; **Deselect All** (verde); rânduri: nume echipă + service type + **checkbox verde**.
  - **TAGS:** grupuri (ex. „Audio/Visual" → „Instruments Played": Any/None/Acoustic Guitar/Bass Guitar/Drums/Electric Guitar/Keys/Organ/Percussion/Piano; „Vocal Part": Any/None/Alto/Bass/Soprano/Tenor) ca **chip-uri** selectabile.
  - **PERMISSIONS:** „Minimum Permissions" → dropdown **Any / Scheduled Viewer / Viewer / Scheduler / Editor / …**.
- **[PEOPLE-QUICKACTION]** Tap scurt pe un rând (sau long-press) → mini-sheet: avatar mare + nume + 3 iconuri verzi: **email / chat / telefon**.
- **[PROFILE]** Header: **X** (close) + „Profile" + **pencil** (edit) + **⋮**. Avatar mare + nume + email + telefon (muted). Buton mare outline verde **„👥 TEAMS 13"**. Tab-uri **SCHEDULE / BLOCKOUTS / MESSAGES** (underline + icon verde pe activ). Jos: **HELP (?) / SETTINGS (⚙️)**.
  - **SCHEDULE:** listă dată: cerc **check verde** (confirmed) sau **„?" portocaliu** (unconfirmed) + dată (bold) + service name (muted, ex. „4. Inchinare Copii Mici").
  - **BLOCKOUTS:** gol → „You have no upcoming blockouts" + buton outline **„ADD A BLOCKOUT"**; cu date → listă.
  - **MESSAGES:** toggle **UNREAD / RECEIVED / SENT**; „UNREAD MESSAGES" + badge portocaliu + **Mark all as read**; listă: dot portocaliu + subiect (bold) + „Received on …".
- **[MY-TEAMS]** Header: back + „My Teams" + **info (i)**. Carduri: nume echipă (mare) + (opțional) icon split + service type + divider + **chip-uri poziții** (ex. „Parcare", „Intrare auditorium & colecta") + jos-dreapta „As often as needed" / „All times".
- **[EDIT-CONTACT]** Header: X + „Edit Contact Info" + **SAVE** (verde). Avatar + **Update Photo** (outline verde). Câmpuri: First name, Last name (input cu underline + icon). **Email:** icon + dropdown tip („Home") + valoare + X; **+ Add Email** (verde). **Phone:** dropdown („Mobile") + valoare + X + checkbox **Enable Text Messaging**; **+ Add Phone**; **+ Add Address** (verzi).
- **[SETTINGS]** Secțiuni: **Appearance** (Theme „Match system theme"), **Notifications** (Team and schedule / Chat conversations / Open system settings), **Audio Files** (Delete / Manage), **Advanced Features** (Enable Staging — checkbox), **About**. *(unele = seam, dar ecranul există în shell.)*
- **[PC-BOTTOM-NAV]** Bottom nav PC (înlocuiește footer-ul app-ului): **Schedule / Plans / Songs / Media / People** cu iconuri (calendar-check / list / music-note / play-square / person). Activ = verde + pill verde-închis.

---

## 10. AI Layer (seam GLOBAL) — 🤖 cerință hard
> **Scop:** din start, orice tab/feature să POATĂ primi AI (prin prompt/input în app), fără rearhitecturare. Acum construim **doar poarta**, nu funcționalități AI. Când vii cu „mi-ar plăcea ca AI să facă X aici", e doar „înregistrezi o acțiune + pui un input".

### 10.1 AI Gateway (serviciu global, server-side)
Un singur punct de intrare: `aiService.run({ feature, action, context, prompt, user })`.
- **Provider-agnostic**, default **Claude API** (suntem pe Claude). Swapabil.
- **Authz:** rulează în contextul permisiunilor userului — AI vede/schimbă doar ce poate userul (ca modelul MCP din PCO).
- **Tool/function registry:** fiecare feature își declară „acțiunile AI" (citește date / propune schimbări). Schimbările trec prin **aceeași validare + authz** ca orice scriere (AI nu ocolește nimic).
- **Human-in-the-loop:** pt. acțiuni cu efect, AI **propune**, userul **confirmă**.
- **Buget & limite:** token/cost caps per org/user/feature (`pc_aiConfig`) — ca să nu explodeze costul.
- **Audit:** fiecare rulare în `pc_aiRuns` (cine/ce/input/output/tokens/cost/status).
- **Kill-switch & control acces:** global + per-feature + per-rol (All / Specific / Admins-only), din admin/dashboard.

### 10.2 Pattern „feature → AI"
Un tab care vrea AI: (1) înregistrează 1+ `action` în registry (ce poate cere AI acolo + ce tool-uri are voie), (2) pune un input/prompt în UI care cheamă gateway-ul cu `feature`/`action` + context. **Atât.** Zero atingere a nucleului.

### 10.3 Ce NU facem acum
Nicio funcționalitate AI concretă. Doar: gateway + registry + config + audit + hook UI. Restul „as we go".

---

## 11. API propriu + Integrări — 🔌 cerință hard
> Scalabil & bine gândit de la început, dar **nu expus** până n-avem ce pune. Plumbing-ul există din zi 1.

### 11.1 API-first intern
- Toată logica în **servicii** în spatele unor **rute versionate** `/api/pc/v1/...`, cu forme REST/JSON consistente (resurse + paginare). Appul mobil consumă exact aceste rute.
- Avantaj: expunerea publică mai târziu = „deschizi ușa", nu rescrii.

### 11.2 Seam API public
- `pc_apiKeys`: chei scoped (refolosesc modelul de capabilități §5) + **rate-limit** + versiune. Middleware de auth pt. chei, separat de sesiunea userului.
- Namespace versionat (`v1`) ca să nu spargem consumatorii la schimbări.

### 11.3 Integrări (gestionate de admin)
- `pc_integrations`: conexiuni externe (Mailchimp, CCLI/SongSelect, MCP, webhooks…) cu **control admin** (cine, ce acces) + audit. Mirror după PCO (All / Specific / Admins-only).
- **MCP (opțional, viitor):** putem expune un endpoint MCP ca tool-uri AI externe să citească date (în limita permisiunilor) — se leagă de §10.

### 11.4 Reporting (seam, din #7/#9)
- PCO are **rapoarte default** (one-day, rooms&resources-for-event, all-year) + **custom** (Liquid/HTML/CSS), export **PDF/web/CSV**, opțiuni (room setup diagrams, public vs full schedule), scoped de filtrele curente.
- La noi = **seam de reporting**: un serviciu care rulează șabloane peste datele modulului. **Nu la lansare.** Candidat excelent pt. **generare cu AI** (§10): „fă-mi raportul X" → AI compune raportul. Util pt. echipa de setup/mentenanță (ce camere/resurse/ore).

### 11.5 Automations (rules engine, din #10)
- Engine generic **trigger → (filtru) → action**: trigger pe evenimente din sistem (ex: form submit, cerere aprobată, programare acceptată…), action = trimite email, creează task, adaugă la workflow, etc. Istoric cu status + retry (`pc_automations` / `pc_automationRuns`).
- **Se sprijină pe arhitectura event-driven (§2):** automatizările sunt consumatori de evenimente → adaugi reguli noi fără să atingi codul care emite evenimentul.
- **Sinergie cu AI (§10):** userul poate cere „fă o automatizare care…" și AI o compune; sau o acțiune de automatizare poate fi „rulează un prompt AI". **Nu la lansare** ca feature de UI, dar event-bus-ul + hook-urile sunt pregătite din start.

### 11.6 Integrări muzicale (din #23 — atenție MultiTracks)
- **`pc_integrations`** (config per furnizor) + **`pc_integrationAccounts`** (cont extern linkat: org SAU per-user, token OAuth, status connected/error, seats/licensed-users) + **import-adapters** (MultiTracks/SongSelect/PraiseCharts → `pc_songs/pc_arrangements/pc_keys/pc_files/pc_chordCharts`).
- **🎸 MultiTracks — must-have pt. user (plătesc mult):** RehearsalPack (audio 12 game), RehearsalMix (stems per instrument), ChartPro. **Blocant de verificat: are MultiTracks API/OAuth public pt. terți?** (integrarea lor cu PCO e parteneriat). Dacă NU → fallback upload manual stems + editor/transpunere proprii. **Recomand: contactăm MultiTracks pt. API/partner program înainte de a promite integrarea.**
- SongSelect (CCLI, copy-limit + activity-60d), PraiseCharts (per-profil, orchestration split). Toate = seam-uri de import, nu blochează lansarea (avem editor propriu).

---

## 12. Email — ✉️ cerință hard (mandatoriu)
> User: trebuie să putem trimite **oricâte** emailuri (chiar cu plată).

- **`emailService` provider-agnostic** (transactional + bulk) în spatele unui provider swapabil.
- **Recomandare provider:** **Amazon SES** pentru volum+cost (~$0.10/1000 emailuri) ; alternativă DX: **Resend/SendGrid** (free tier apoi plătit). Decidem în §8.
- **Deliverability obligatoriu:** domeniu propriu de trimitere + **SPF/DKIM/DMARC** (altfel ajung în spam). 
- **`pc_emailTemplates`** (șabloane) + **`pc_emailLog`** (audit trimiteri: to/template/status/providerId).
- **Liste/segmente** (ca Mailchimp) = refolosim conceptul de „listă de persoane" din People; Mailchimp propriu-zis = integrare opțională (§11).
- **Bulk → consimțământ + dezabonare** (GDPR). Transactional (remindere slujire, resetare parolă) = separat de marketing.

---

## 13. Securitate (avem deja mult — doar aliniem)
> User: „avem multă securitate deja, nu te stresa, doar ține cont." Mapăm la ce există (`securitylogs`, auth, roluri) + adăugăm seam-uri.

- **2FA / two-step** (încurajat pt. cei cu acces la DB), **expirare sesiune** (aliniem o politică, ex. inactivitate).
- **Privacy mode** ON by default (contact ascuns). **Inactive ≠ delete** (soft-delete + motiv, păstrăm dovada).
- **Verificare identitate** înainte de schimbări sensibile (email/telefon) — anti-impersonare.
- **Bannere de risc** pe cereri suspecte (seam de scoring).
- **Audit/system logs** pt. schimbări sensibile (permisiuni, contact, AI, integrări) → `pc_auditLog` / `securitylogs` existent.
- **Authz server-side** peste tot (invariant §1.4). API keys & AI = subiecte authz separate, dar aceeași disciplină.
- GDPR: minimizare date, consimțământ email, dreptul la ștergere (soft-delete + hard-delete controlat de orgAdmin).
- **⚖️ Copyright conținut (din #21, confirmă discuția de la lansare store):** lyrics/charts/audio copyrighted au nevoie de **licență** (CCLI Church Copyright/SongSelect/Rehearsal/Streaming, MultiTracks, PraiseCharts). Pattern-uri safe: **audio stream-only** (nu download), **link-out** la Spotify/YouTube/Apple, **license tracking** (`pc_fileLicenses` + Access Log pt. raportare CCLI). La lansarea în store: fără conținut copyrighted nelicențiat.

---

## 14. Pre-build hardening — răspuns la cele 5 cerințe mandatorii (user)
> Audit explicit înainte de orice cod. Fiecare cerință = o garanție arhitecturală + ce rămâne de decis.

### 14.1 ✅ AI posibil PESTE TOT (cerința #1 — „să nu mă trezesc că nu pot")
**Garanție:** nu construim NICIO funcționalitate AI acum (e inutil), dar arhitectura permite FIZIC ca orice domeniu să primească AI mâine, doar prin „înregistrezi o acțiune + pui un input". Mecanismul (§10):
- **Regula de aur care face asta posibilă:** **orice scriere trece printr-o metodă de serviciu** (`servicesService.createPlan(...)`, `peopleService.mergePeople(...)`, etc.), NU prin cod împrăștiat în rute. **AI Registry-ul (§10) împachetează exact aceleași metode de serviciu.** Consecință: dacă un user poate face o acțiune, AI o poate face automat prin aceeași poartă, cu aceeași validare + authz + audit. Zero rearhitecturare.
- **Matrice de acoperire AI (exemple VIITOARE, NU le construim):**

| Domeniu | Exemplu de automatizare AI posibilă mâine |
|---|---|
| **Scheduling** | „programează-mi echipa de duminică respectând preferințele + blockouts" (Auto-Scheduler devine prompt) |
| **Songs/Order** | „propune un order of service de 70 min pe tema «har»" / „transpune în Female Key" |
| **People** | „fă o listă cu toți voluntarii neprogramați de 60 zile" / „detectează duplicate" |
| **Calendar** | „găsește o sală liberă marți seara pt. 50 oameni" / „rezolvă conflictul X" |
| **Comunicare** | „scrie emailul de reminder pt. echipa tehnică" / „rezumă activitatea săptămânii" |
| **Reporting** | „fă-mi raportul CCLI pe luna trecută" (candidat ideal, §11.4) |
| **Forms/Automations** | „fă o automatizare: când se aprobă o nuntă, creează task + trimite email" |

- **Ce punem acum (plumbing):** `aiService.run()` (gateway) + registry de acțiuni (gol la start) + `pc_aiConfig` (kill-switch per feature/rol) + `pc_aiRuns` (audit) + un hook UI standard („buton AI") pe care orice ecran îl poate chema. **Atât.**

### 14.2 ✅ TOTUL într-un singur loc în DB (cerința #2 — „să nu fie împăienjenit")
**Garanție:** când deschizi DB-ul, vezi modulul ca pe un bloc unic, organizat logic — nu împrăștiat.
- **🎯 DECIZIE (vezi §14.6.B pt. raționament complet): ACEEAȘI bază cu prefix `pc_`** (NU bază separată) — fiindcă vrei **reuse adânc** cu app-ul existent (teams→prayer rooms, acces direct la date). În Compass toate colecțiile `pc_*` se grupează alfabetic = „un bloc Planning Center", dar `$lookup`/tranzacții/indici unici cross-modul merg **nativ** (o bază separată le-ar rupe exact la granița pe care vrei s-o folosești). Cost identic.
  - Legătura cu app-ul existent (`users`, prayer rooms) = **referință `ObjectId` în aceeași bază** → join-uri native, fără friction.
  - **Alternativă (dacă prioritizezi izolarea vizuală peste integrare):** bază separată `planningcenter` pe același cluster → vezi DOAR modulul în Compass, dar accepți join-uri la nivel de app la graniță.
- **Organizare logică în interior (indiferent de alegere):** numele colecțiilor se pot **grupa pe sub-context** ca să se sorteze cu sens în Compass: `services_*` / `people_* ` / `calendar_*` / `core_*` (org, campuses, permisiuni, ai, email, audit). *(azi folosim `pc_` peste tot ca placeholder — la build alegem una din cele 2 convenții; ambele sunt pur cosmetice, zero impact pe logică.)*
- **Cod la fel de izolat (invariant §2, CERINȚĂ HARD user):** UN folder părinte pe fiecare parte — `server/planning-center/` + `app/planning-center/` — un dev nou deschide DOAR aceste 2 foldere și înțelege tot. Zero cod PC împrăștiat.

### 14.3 📋 Lucruri „ridicole / fără rost" pt. o app GRATIS (cerința #3 — enumerate, TU decizi keep/drop)
> App-ul e **gratis**. Mai jos, tot ce ține de bani/licențe/externe plătite. **Zi-mi la fiecare: PĂSTREZ sau ARUNC.** (Default-ul meu = recomandarea; nu construiesc nimic din astea până nu zici.)

| # | Element | Ce e | Recomandarea mea |
|---|---|---|---|
| 1 | **Billing manager / subscriptions** | Facturare cont (PCO) | ❌ ARUNC (deja N/A — n-avem billing) |
| 2 | **MultiTracks (integrare)** | API inexistent + ToS restrictiv | ⚠️ PĂSTREZ doar ca **seam gol** (coexistență); nu construim |
| 3 | **Seats / licensed-users** | Locuri plătite RehearsalMix/ChartPro | ❌ ARUNC (ține de MultiTracks, nu de noi) |
| 4 | **SongSelect (CCLI)** | Abonament + copy-limit + activity-60d | ⚠️ PĂSTREZ ca seam de import (dacă TU ai abonament CCLI) |
| 5 | **PraiseCharts** | Licențe per-fișier (5/fișier) | ⚠️ seam opțional; probabil ARUNC la lansare |
| 6 | **`pc_fileLicenses` (license tracking)** | Urmărire licențe CCLI + overage emails | ⚠️ util DOAR dacă raportezi CCLI; altfel ARUNC |
| 7 | **Background checks (Checkr)** | Verificări voluntari (plătit) | ⚠️ PĂSTREZ ca flag manual (clear/pending), FĂRĂ provider plătit |
| 8 | **SMS / Twilio / email-to-text** | Notificări prin SMS (plătit) | ❌ ARUNC (deja N/A — folosim push) |
| 9 | **Giving / currency / Text2Give** | Donații/bani | ❌ ARUNC (deja N/A) |
| 10 | **Payments pe forms** | Taxă pe cerere (ex. nuntă) | ❌ ARUNC (seam N/A) |
| 11 | **Mailchimp** | Marketing bulk extern | ❌ ARUNC (avem email propriu §12) |
| 12 | **Transpunere audio DSP** | Cost compute server (ffmpeg) | ⚠️ PĂSTREZ dar **faza 2** (chord transpose e gratis & suficient la lansare) |
| 13 | **CarPlay / Android Auto / Widgets** | Nice-to-have mobil | ⚠️ seam-uri, faza 2 |
| 14 | **Dashboards / Kiosk / Embed / Reporting Liquid** | Scope mare, nu costuri | ⚠️ seam-uri, faza 2 |
| 15 | **Email provider plătit (SES)** | ~$0.10/1000 emailuri | ✅ PĂSTREZ (tu ai zis „chiar și cu plată"); cost minim |
| 16 | **Storage fișiere (Cloudinary/R2)** | Cost găzduire audio/PDF | ✅ PĂSTREZ (necesar; ieftin; deja ai Cloudinary) |

### 14.4 ✅ Nimic SUPER-HARDCODAT → replicabil pt. alții (cerința #4)
**Garanție:** poți da app-ul altei biserici și se replică curat, fără „chestii aiurea" lipite în cod.
- **Zero hardcoding de brand:** numele bisericii, logo, culori, email, adresă → toate în `pc_org` + un **theme config** (nu în cod). România = **default în date**, nu în cod (`pc_campuses` + locale).
- **Roluri = DATE, nu cod** (§5): „2 roluri la lansare" e doar UI; stocarea suportă orice combinație. Altă biserică își poate activa scheduler-only/editor-pe-folder fără să atingă codul.
- **Fără ID-uri / emailuri / campus hardcodate** nicăieri. Fără „if church == Vertical".
- **Feature flags** (ca `pc_aiConfig`): fiecare deployment pornește/oprește module (Calendar on/off, audio-transpose on/off, forms on/off…).
- **Secrete în ENV**, niciodată în cod (chei storage, chei email, connection string).
- **🌍 i18n din zi 1:** TOATE textele vizibile externalizate (RO acum, dar traductibil) — critic fiindcă ai filiale în alte țări ȘI vrei să dai app-ul altora. Ieftin acum, scump retroactiv.
- **Bootstrap/seed script:** „biserică nouă" = rulezi un seed care creează `pc_org` gol + 1 campus default (RO) + cele 2 roluri + 1 calendar default + 1 service type default. Replicare în minute.
- **Numele DB/prefixul = config** (§14.2), ca să poți rebrandui.

### 14.5 🧭 Ce trebuie să ȘTII înainte să construim (cerința #5 — decizii care schimbă fundația)
> Astea ating TOATE schemele/rutele. Răspunsul tău la ele = fundația. Le punem în §8 ca „de decis".
1. **🔑 MODEL DE TENANCY (cea mai importantă):** vrei (A) **un deployment per biserică** (fiecare cu baza ei; config-driven → replicare ușoară; izolare totală — **recomand pt. început**), SAU (B) **multi-tenant real** (un singur server ține MAI MULTE biserici, cu `tenantId` pe FIECARE document + fiecare query scoped)? **B e mult mai complex și trebuie decis ACUM** — adaugă `tenantId` peste tot. Pt. „dau app-ul altora" ambele merg; A e mai simplu și mai sigur, B scalează pe un singur server.
2. **🗄️ Layout DB:** bază separată `planningcenter` (recomand) vs prefix `pc_` în baza actuală (§14.2).
3. **🔗 Legătura `pc_people` ↔ `users`:** migrăm userii actuali în `pc_people` (1:1) la start? Cine devine prima persoană-admin?
4. **📦 Storage fișiere:** Cloudinary (îl ai deja) vs Cloudflare R2. Fișiere private = **stream-only + signed URLs** (invariant §1.8 + copyright). Decidem ACUM (afectează file service).
5. **✉️ Domeniu de email:** ai nevoie de un domeniu de trimitere + **SPF/DKIM/DMARC** (altfel spam). Lead-time DNS. Provider = SES (recomand).
6. **🎯 MVP / felia de lansare:** am modelat ~90 colecții — **NU le construim pe toate la lansare.** Propunerea mea de felii verticale (fiecare livrabilă singură): **(1) People** (profil + households + import CSV + permisiuni) → **(2) Services core** (service types + plans + order + teams + scheduling manual + accept/decline + songs + chord transpose) → **(3) Calendar** (rooms/resources + bookings + anti-double-booking). Restul (auto-scheduler, matrix, forms, automations, lists, workflows, audio-transpose, dashboards) = faze ulterioare, dar seam-urile există. **Confirmă felia 1.**
7. **📈 Scală:** azi ~300 oameni (mic). Dacă dai app-ul altora → mii? Design-ul ține, dar confirmă-mi plafonul așteptat (influențează indici + tenancy).
8. **🔁 Realtime:** refolosim socket-ul existent (pattern pray-room) — confirmat.
9. **🌍 i18n:** confirmă că externalizăm textele din start (recomand DA).
10. **⚖️ Legal/conținut:** la lansarea în store, fără conținut copyrighted nelicențiat (§13). Confirmat.
11. **🧪 Seed & migrații:** bootstrap pt. tenant nou + disciplină `schemaVersion` (invariant §1.2) — le punem din start.

### 14.6 Decizii de fundație — răspunsurile tale + sinteza mea onestă
> Ți-am dat 3 răspunsuri; la 2 din ele îți dau un push-back onest (mi-ai cerut explicit: „complexul DOAR dacă nu distruge forever"). Rezultatul respectă ce ai cerut de fapt.

**A) TENANCY → recomand A (deployment-per-biserică) + seam `orgId`, NU multi-tenant complet.**
- Ai zis: „fă complexul DOAR dacă e one-time și nu complică forever." **Onest: multi-tenant complet (B) NU e one-time — e disciplină PERMANENTĂ** (`tenantId` pe fiecare document + fiecare query scoped forever).
- **Mai grav:** ai zis (la #2) că vrei să REFOLOSEȘTI app-ul existent (prayer rooms/users/teams). App-ul tău e **single-tenant** (o comunitate). Dacă faci DOAR PC multi-tenant → „split-brain". Ca să faci B corect ar trebui să convertești **TOT app-ul** la multi-tenant = **exact scenariul „distruge/complică forever"** pe care vrei să-l eviți.
- Singurul beneficiu al lui B = multe biserici pe UN server (SaaS găzduit de tine). **Nu-ți trebuie:** „dau app-ul altora" = fiecare biserică rulează propria copie (A), replicabilă prin config + seed.
- **Soluția care-ți dă ȘI forward-proofing, one-time, fără tax:** rulăm **A**, dar **ștampilăm `orgId` pe fiecare document PC din zi 1** (default = org unică) + helper de scoping pe toate query-urile. ĂSTA e „jobul complex făcut o dată" (invariant §1.13). Dacă vreodată vrei B, câmpul + helperul există deja → **zero retrofit.** Ușa rămâne deschisă, taxa n-o plătești acum.

**B) DB → recomand ACEEAȘI bază cu prefix `pc_`, NU bază separată.**
- Ai zis că-ți place o bază separată, DAR vrei reuse adânc (teams→prayer rooms, acces direct la date din app/jocuri). **Cele două trag în direcții opuse.**
- Bază separată = izolare vizuală frumoasă, DAR `$lookup` într-o singură agregare **NU merge între baze** → join-uri la nivel de app EXACT la puntea pe care vrei s-o folosești des. Mic, dar recurent.
- **Costul e identic** (aceeași bază/cluster; MongoDB nu taxează per-DB). Bază separată **nu economisește nimic**.
- **NU te „împarte în 2 apps":** indiferent de alegere, e UN backend + UN API + UN app mobil. Numărul de baze e invizibil pentru userul din app.
- **Recomand aceeași bază + prefix `pc_`:** „totul într-un loc" (grupate alfabetic în Compass) + reuse frictionless + cost identic. Dacă totuși vrei izolare vizuală peste integrare → bază separată rămâne validă (accepți join-uri la graniță).

**C) MVP → REDENUMIT „ordine de construcție (fără throwaway)". Clarificarea ta = acceptată 1000%.**
- **NU facem MVP-ca-produs-redus.** Facem TOT; la final = **100% garantat tot**.
- Fiindcă arhitectura e **aditivă prin design** (invariant §1.2), construcția în felii = **completare incrementală, NICIODATĂ throwaway.** Fiecare felie e cod **FINAL** care respectă arhitectura; felia următoare o **EXTINDE**, n-o rescrie.
- Rolul ordinii = doar „ce atacăm întâi" (să nu sărim haotic), **nu** tăiere de scope. Când zici „continuă restul", adăugăm fazele rămase pe aceeași fundație.
- **🔒 GARANȚIE EXPLICITĂ:** la finalul construcției **NU** există „trebuie reconstruit ca să fie ce voiai inițial". Felia 1 nu presupune nicio scurtătură care contrazice finalul. Dacă o decizie de felia 1 ar forța o rescriere ulterioară, o tratez ca bug de arhitectură, nu ca „normal MVP".
- **Ordine de atac propusă** (scope-ul final = TOT, astea-s doar pașii): **People** → **Services core** (service types/plans/order/teams/scheduling manual/accept-decline/songs/chord-transpose) → **Calendar** (rooms/resources/bookings/anti-double-booking) → scheduling avansat (auto-scheduler/matrix) → forms/automations/lists/workflows → files/media/songs-avansat/audio-transpose → LIVE/reporting/dashboards → mobile polish (widgets/CarPlay/offline). Fiecare = finală pe bucata ei.

---

## 15. Changelog
- **v0.29** — **🏗️ BUILD Faza 0 + People.** **Backend** `server/planning-center/` (core: schema+orgScope+permissions; 14 modele `pc_`; seed+migrare `users`→`pc_people`; rute `/api/pc/v1/people` + admin; 1 linie mount în `server/index.js`) — 23 fișiere, load OK. **Frontend** `app/planning-center/` (temă PCO; `pcApi`; shell app-in-app tab „Planificare" + Immersive + `PcTabBar`; ecrane People IDENTICE: list/sort/filter/quick-action/profile/my-teams/edit-contact/settings + account/exit; stub-uri Schedule/Plans/Songs/Media) — 20 fișiere, parse curat. Tab „Resurse"(Courses)→„Planificare" în `App.js`+`CustomTabBar.js`. Vezi §16.
- **v0.28** — **🏗️ START BUILD.** §16 BUILD PROGRESS (evidență strictă cu ✅/🔨/🧪/⬜/⏸️). **Folder părinte unic** (cerință user): `app/planning-center/` + `server/planning-center/` (§2 + §14.2). **Temă PCO tokens** + **spec UI People IDENTIC** cu screenshot-urile (§9: list/sort/filter/quick-action/profile/my-teams/edit-contact/settings + bottom-nav + culori). Shell app-in-app (tab Resurse→Planificare). Faza 0 (fundație) în curs.
- **v0.27** — **✅ Permisiuni Services complete (#Perm)** absorbit în §5. **§5.6 matricea exactă de capabilități** per nivel (navigare/people/profile/songs-media/chat/plans/scheduling/LIVE/general) = sursa pt. catalogul de capabilități-ca-date. **Ladder Song/Media = SV<V<E<A (fără scheduler).** **STORED vs DERIVED** clarificat (Manage Permissions = 3 dropdown-uri + file access; restul derivat). **§5.7 `pc_servicesDefaults`** enumerat (toggle-urile `*`; checker-ul le consultă mereu). **§5.8** flux Manage Permissions + bulk + downgrade=archive + **reguli notificări** (welcome/upgrade/removal; orgAdmin-removal → toți orgAdminii, securitate). Scope folder/service-type + „Same As Parent" rafinat. **Arhitectura e completă pt. felia de build People.**
- **v0.26** — **Shell „app-in-app" (CONFIRMAT user).** Build **mobile-only**, în app-ul existent. Tab footer **„Resurse"→„Planificare"**; la tap, tab-bar-ul principal dispare și e înlocuit de bottom nav-ul PC (Schedule/Plans/Songs/Media/People), navigator imbricat + ieșire. §2 + §7 actualizate. **Implicație mobile-only:** acțiunile „web-only" PCO (creare media/tag-uri) se fac pe mobil la noi (§9 `[MOBILE-WEBONLY]` re-evaluat). **Keep/drop CONFIRMAT** (default-urile). **Scope doc:** mai absorbim DOAR „Permisiuni Services complete"; LIVE + Reporting amânate. Tenancy A + DB-prefix confirmate cu condiția „portița mereu deschisă" (§14.6.A).
- **v0.25** — **Decizii de fundație (§14.6)** din răspunsurile tale + push-back onest. **(A) Tenancy:** deployment-per-biserică + **seam `orgId` din zi 1** (invariant NOU §1.13) în loc de multi-tenant complet (ar fi forțat conversia întregului app = „complică forever"). **(B) DB:** aceeași bază + prefix `pc_` (reuse frictionless cu prayer rooms/users; bază separată ar rupe `$lookup` la graniță; cost identic) — am revizuit recomandarea §14.2. **(C) MVP respins:** facem TOT, „ordine de construcție fără throwaway" (aditiv prin §1.2), garanție explicită zero-rescriere. §8 blocante → rezolvate/de-confirmat.
- **v0.24** — **Pre-build hardening (§14 nou)** — răspuns la cele 5 cerințe mandatorii. §14.1 matrice acoperire AI (regula „orice scriere = metodă de serviciu → AI Registry o împachetează automat"). §14.2 **decizie DB: bază separată `planningcenter` (recomand) vs prefix** + grupare logică pe sub-context. §14.3 **tabel enumerativ keep/drop** (16 elemente bani/licențe/externe — user decide). §14.4 anti-hardcoding + **i18n din zi 1** + bootstrap/seed + feature flags + theme config. §14.5 **11 decizii de fundație** — cea mai importantă: **modelul de tenancy** (deployment-per-biserică vs multi-tenant cu `tenantId`). MVP în felii verticale (People→Services core→Calendar). Întrebări mutate în §8. Changelog → §15.
- **v0.23** — Bucata #24 (📱 Services Mobile). **Confirmare arhitecturală majoră: mobilul NU are model separat** — aceeași bază + aceleași API-uri `/api/pc/v1` (validează §1.11 + „two faces"). **Offline/cache REZOLVAT** (audio 30z după plan, clear manual; My Schedule offline). Entități noi: **`pc_mediaPlaybackState`** (skip/loop/download sincronizate web↔mobil) + **`pc_notificationPrefs`** (push per tip + badge unread|pending; preferred-app & SMS = N/A). Media player mobil (List/Song/Lyrics/Docs/Notes + loop + metronom + mini-player + CarPlay/Android Auto seam). Widgets home-screen = seam. Scan doc→OCR Lyrics&Chords (iOS). Web-only by design: creare media items / editare media / creare tag-uri. +11 note UI mobile. Întrebări noi §8 (CarPlay, widgets).
- **v0.1** — Schelet + invariante + strategie de izolare DB + bucata #1 (overview/search/notificări/media sizing).
- **v0.2** — Bucata #2: miezul Services. Confirmat ServiceType/Plan/PlanTime/Team/Position/Assignment/Song/Media + relația M2M Team↔ServiceType + assignments legate de ore + roster via apartenență echipă. Flag scope Calendar (produs separat). Admin ≥2.
- **v0.3** — Scope confirmat = Services + People + Calendar (3 produse, 1 modul). Bucata #3: model complet de permisiuni (dimensiuni: People&Plans/Song/Media/file-access/leadership/LIVE/Chat; niveluri scheduledViewer→orgAdmin; scope per folder/service-type cu moștenire). Entități noi: `pc_folders`, `pc_teamMembers`, `pc_permissions`. Adăugat §9 NOTES UI.
- **v0.4** — Bucata #4 (account settings). **Invariant nou #1.9: timezone-aware UTC + multi-campus, RO default, tz per filială.** Entități noi: `pc_org`, `pc_campuses`. Marcat N/A: SMS/Twilio, currency, grades. Note UI pt. localization/logo/notificări. Timezone open-question = REZOLVAT.
- **v0.5** — Bucăți #5 (security/AI/API/email) + #6 (toolbar/dashboards). **3 invariante noi: #1.10 AI-ready (seam global), #1.11 API-first, #1.12 email service.** Secțiuni noi: **§10 AI Layer**, **§11 API+Integrări**, **§12 Email**, **§13 Securitate**. Entități noi: `pc_aiRuns/pc_aiConfig`, `pc_apiKeys/pc_integrations`, `pc_emailTemplates/pc_emailLog`, `pc_auditLog`, `pc_tasks`, `pc_dashboards/pc_widgets` + flags privacy/inactive/risk. Note UI security + AI entry. Changelog mutat la final.
- **v0.6** — Bucata #7 (Calendar complet). Sub-context Calendar modelat: `pc_calendars/pc_events/pc_eventTimes/pc_rooms/pc_resources/pc_roomRequests/pc_resourceRequests/pc_bookings/pc_approvalGroups/pc_roomSetups/pc_tagGroups/pc_eventRequestForms/pc_connections`. **Anti-double-booking + workflow aprobare** (§6). **Dimensiuni noi de permisiuni** Event/Rooms/Resources/People + Conflict Resolver (§5.9). **Puntea `pc_connections`** Calendar↔Services (§2). Reporting Liquid = seam (§11.4). Note UI Calendar (warn icons, start day, published, email prefs, views). Întrebări noi scope Calendar (§8).
- **v0.22** — Bucata #23 (Integrări). §11.6 + `pc_integrations`/`pc_integrationAccounts` + import-adapters. **🎸 MultiTracks modelat fidel** (RehearsalPack/RehearsalMix-stems/ChartPro, seats, no-storage, account+recording linking) + **FLAG CRITIC feasibility** (API terți? parteneriat PCO → de verificat; fallback upload manual). SongSelect (CCLI copy-limit/activity-60d/ChordPro editable), PraiseCharts (per-profil, orchestration split). Check-Ins = N/A (attendance propriu). Întrebare prioritară MultiTracks API în §8.
- **v0.21** — Bucata #22 (🎶 SONGS + TRANSPUNERE — cireașa). Song→Arrangement→Key confirmat (`pc_songs/pc_arrangements/pc_keys`). **`pc_chordCharts`** (ChordPro→PDF auto per key + capo + number/numeral, nu ocupă storage, ChordSheetJS). **Coduri ChordPro** documentate (SECTION/[Chord]/TRANSPOSE KEY/REDEFINE KEY/{}/{{}}/breaks/style/simboluri). **`pc_audioTranspositions`** (DSP queue — PCO confirmă server-side + quality caveat = recomandarea mea A1/A2). Sequences, song/arrangement tags, Top Songs, integrări seam. Note UI song page/files/transpose/chordpro/filter/tags. Decizii transpunere în §8.
- **v0.20** — Bucata #21 (Files & Media). Model unificat `pc_files` (upload/link/youtube/vimeo/chordChart/textDoc/stageLayout). Audio stream-only vs download (= pattern Cloudinary). `pc_fileTags` (auto-assign keyword, max 15, limited file visibility). `pc_fileLicenses` (purchased/used/admin + Access Log → CCLI). Copyright în §13 (confirmă discuția store). `pc_mediaItems/pc_mediaFiles` (container multi-file, auto-archive, thumbnail). Lyrics&Chords editor (ChordPro→transpunere). Note UI (video link search, text doc, media filter AND/OR, license email).
- **v0.19** — Bucata #20 (Team management). 4 tipuri echipă detaliate pe `pc_teams.flags` (rehearsal dă file-access indiferent de perms; secure=BG gating; split; tag dinamic). `pc_backgroundChecks` (seam). Scheduling gap alerts (**1pm campus tz**). onDecline 5 opțiuni. scheduledViewerAccess. relatedTeams. Merge/archive/delete team. Auto-assign. Automations pe team (via §11.5). Attendance. `pc_calendarFeeds` (webcal per user). Note UI: My Schedule + team actions mobil + iconuri tipuri echipă.
- **v0.18** — Bucata #19 (Organize + Manage people). **Folder→campus→timezone** (sursa tz la programări; `pc_folders.campusId`). Limited file visibility (tag×poziție). Tag teams dinamice. Service type archive/delete/restore. **Archive vs Remove în Services** (≠ People inactive/delete) + Music Stand annotations restaurate. `pc_servicesDefaults` (permisiuni default). Current folder, welcome email condiționat, filter (OR/AND + pinned + URL), bulk edit + istoric. Linked accounts = N/A seam.
- **v0.17** — Bucata #18 (Comunicare cu echipa). Email de programare (UI note din screenshot). **Reminder emails tz-aware** (7z/per-oră/10am local → `pc_reminderSettings`, cron pe tz campus, leagă §1.9). Email templates 4 tipuri + personal/shared. „Replies To" (semnătură/răspunsuri). Prepared notification rafinat. Părinți copiați pe email copil. SMS=N/A (push primar). Canale email/chat/push + recipient-selection engine.
- **v0.16** — Bucata #17 (🗓️ Scheduling ADÂNC). **Conflict/blockout engine** (4 tipuri badge, warnings-not-blocks) + **regula ta clarificată** (2 enforcement: scheduler=warning, membru-blockout-peste-pending=hard-block, §6). **Auto-scheduler algoritm** (last-scheduled→blockout→prefs + undo, `pc_autoScheduleRuns`, candidat AI). Entități: `pc_signupSheets`, `pc_blockoutRequests`, `pc_annotations` (Music Stand). Refine `pc_assignments` (prepared/replacement/declineReason) + `pc_schedulingPreferences` (month/day/team/household). Rehearse tools (media player/songbook PDF/Music Stand+adnotări). Volunteer pipeline (People→Services). Reschedule plans. +8 note UI.
- **v0.15** — Bucata #16 (Order/Notes/Files/Items detaliat). **Template unificat** (order+notes+teams+needed, import=merge). **Item leader dinamic** (poziție/persoană). `pc_serviceTypeSettings` (note categories, item row colors keyword→culoare, time preferences, public view, frequency). `pc_stageLayouts`. Fișiere cu tipuri (stage layout/video/link) + scope item. CCLI data per song item. Split teams + time preferences. Delete/recover 30z.
- **v0.14** — Bucata #15 (Services: Plan your service + UI). **Time assignments conduc totul** (`pc_timeAssignments` → My Schedule/remindere/notificări). Item leaders/colors/exclude-from-time. `pc_series`+title. Echipe speciale: secure(bg-check)/split/tag/backup/guest (`pc_serviceTags`). `pc_planCollaborators` (audit plan), `pc_attendance`. Share: public view/schedule-publish/worship-set/permalink. **Note UI plan page** (Order/Teams/Times/Notes/Files — referință vizuală cerută de user). +întrebări scope.
- **v0.13** — Bucata #14 (🎯 SERVICES intro). Scheduling engine: `pc_schedulingTemplates`, `pc_neededPositions`, `pc_schedulingPreferences`, **Auto-Scheduler** (candidat AI §10), **Matrix** (multi-săptămână + 1 email). Team type rehearsal/non-rehearsal, `pc_teamLeaders` (replies-to + notif prefs), `pc_planTemplates`, `pc_planNotes`, `pc_planFiles` (scope plan/service-type). Assignment status+source. Blockout↔pending home (§6). My Schedule membru. +7 note UI.
- **v0.12** — Bucata #13 (Lists detaliat). Rules engine ierarhic (all/any/none nested + include/exclude + at-least/exactly/at-most) serializat în `pc_lists.rules`. Expansiune household, auto-refresh, condition ownership, views (Unmanaged/Needs-attention/Starred), playlist mode. Reports din listă (mailing labels = seam). +3 note UI.
- **v0.11** — Bucata #12 (People detaliat). Rafinări: **inactive≠delete cu cascadă cross-modul** (Services declină/scoate din echipe), **GDPR partial-erasure**, merge detaliat, `pc_activity`, `pc_commHistory`, **ownership + unassigned recovery** (staff transition). Forms: 3 categorii câmp (profile/workflow/basic) + collaborators/notif/spam/embed. Comunicare: senders/templates/scheduled/history, Mailchimp opțional (SES scalează), SMS consent (N/A), notificări digest/bundling. +8 note UI.
- **v0.10** — Bucata #11 (**PEOPLE** pilon). **Profil ≠ login:** `pc_people` autoritativ cu link opțional la `users` (§4.1) → permite import bulk fără conturi. **CSV import/export** (remote_id, preview, undo 48h) + template `people_import_template.csv`. Entități: households, custom fields/tabs, lists (segmentare), workflows (pipeline), notes+categorii (prayer), duplicate detect/merge, directory, membership, imports, spam list, email senders. Note UI People (import preview, hidden custom, child/adult, HIPAA, dir sharing). Engine-uri generice noi: custom-fields, lists, workflows, notes.
- **v0.9** — Bucata #10 (Forms + Automations). **🧩 Form engine generic** (`pc_forms`/`pc_formFields`/`pc_formSubmissions`) cu field types + logică condițională + status Open/Closed/Archived. Event request workflow cu „apply rooms/resources penciled-in" (§6). **⚙️ Automations engine** (`pc_automations`/`pc_automationRuns`, §11.5) legat de event-bus + AI. Payments = seam N/A. Note UI forms/automations.
- **v0.8** — Bucata #9 (Calendar final). **Multiple calendars + access control** (`pc_calendarAccess`, privacy per calendar, §5.9). **Resolve conflicts**: blockout-wins, notificare la 30min, rezolvare shared (`pc_conflicts`). **Blockout pe rooms/resources** (`pc_roomResourceBlockouts`, ≠ blockout persoane). Tranziții aprobare la mutare calendar. Connections vs Feeds (feeds=N/A). Vizibilitate + **link-only** + față publică (List/Month/Gallery). Sharing: iCal/embed/kiosk/print (seam-uri §11). Reports default+custom (§11.4). ~8 note UI noi.
- **v0.7** — Bucata #8 (Calendar detaliat). **Aprobare pe 2 niveluri independente** (event-level + room/resource), multi-grup, ireversibilă + **conflicte blochează notificările** (§6). Tags: required/color/CC-category/sortOrder. **Filtre cu logică OR-în-grup/AND-între-grupuri.** Vizibilitate 3-stări (unpublished/published/featured). Location campus/custom/virtual. Recurență + **overrides per-instanță** (`pc_eventInstances`), `pc_eventTemplates`, `pc_approvalGroupAssignments`. Feeds Groups/Reg = N/A. ~10 note UI noi (required tags, filter logic, recurrence edit, approve ireversibil, conflict-first, files private…).

---

## 16. BUILD PROGRESS (evidență strictă) 🏗️
> Legendă: ✅ gata & verificat · 🔨 în lucru · 🧪 făcut, de testat pe device · ⬜ de făcut · ⏸️ amânat (seam/fază ulterioară).
> Regula: **fiecare bucată = cod FINAL** (aditiv, zero throwaway, invariant §1.2). Nimic „de rescris la restul".

### Faza 0 — Fundație modul (backend + frontend shell)
- ✅ **Mapare codebase** (navigație/temă/API/backend/user-model) — făcută (2 explorări).
- ✅ **Backend parent folder** `server/planning-center/` (core/ models/ routes/ services/). 1 linie mount în `server/index.js` (`app.use("/api/pc", …)`).
- ✅ **DB & conexiune** — aceeași bază `laudarosii`, colecții `pc_` cu nume explicit (`mongoose.model(name, schema, "pc_…")`) (§14.6.B).
- ✅ **Org-scoping seam** `orgId` pe fiecare document + helper unic `orgScope/scoped/stamp` (invariant §1.13, „portița"). `core/orgScope.js`.
- ✅ **Convenții schemă** — `pcSchema()` injectează `orgId`+`schemaVersion`+timestamps+`deletedAt`. `core/schema.js`.
- ✅ **Seed/bootstrap** — `ensureBootstrap()`: `pc_org` + campus RO (Europe/Bucharest) + `pc_servicesDefaults` + tag-uri People. Idempotent. `services/seed.js`.
- ✅ **Auth bridge** — refolosește `authMiddleware` existent (`req.user`); rol app → nivel PC (`core/permissions.js`). 🧪 de rulat live (seed via `POST /api/pc/v1/admin/seed`).
- ✅ **Frontend parent folder** `app/planning-center/` (navigation/screens/components/api/theme). 1 linie în `App.js` (import + `<Tab.Screen name="Planificare">`).
- ✅ **Temă PCO** `theme/index.js` (tokens near-black + verde PCO din §9).
- ✅ **Shell app-in-app** — tab „Resurse"(Courses)→**„Planificare"** (în `CustomTabBar.js` + `App.js`); la focus footer principal **hidden** (Immersive) + **bottom nav PC** (PcTabBar: Schedule/Plans/Songs/Media/People) + ieșire („Ieși din Planificare" / Android back). Navigator imbricat (`PlanningCenterNavigator`). 🧪 de testat pe device.
- ✅ **API client PC** `api/pcApi.js` — refolosește clientul existent (`api.get("/pc/v1/…")`, Bearer auto).

### Faza 1 — People (prima felie verticală, UI identic PCO)
**Backend** (scris + verificat la load; 🧪 = de testat live cu DB)
- ✅ `pc_people` (profil ≠ login, link opțional `userId`, `orgId`) + indici + text-search + virtual fullName.
- ✅ `pc_households`, `pc_teams`, `pc_positions`, `pc_teamMembers`, `pc_serviceTypes`, `pc_membershipTypes`, `pc_tagGroups`, `pc_tags` (minimal pt. People, aditiv).
- ✅ `pc_permissions` (3 niveluri stocate + file access, scope) + **checker server-side** (`can/requireCan`, consultă `pc_servicesDefaults`) (§5.6/§5.7).
- ✅ Rute `/api/pc/v1/people`: `GET /me`, `GET /meta/filters`, `GET /` (list+search+sort+paginare+filtre Teams/Tags/Permissions+vizibilitate), `GET /:id`, `GET /:id/teams`, stub `schedule/blockouts/messages`, `POST /` (create), `PATCH /:id/contact`.
- ✅ Migrare `users` → `pc_people` (1:1, idempotent) în `services/seed.js` (`migratePeople`). 🧪 de rulat.
- 🔨 **Import CSV bulk** (`pc_imports`): model ✅; rute upload/preview/commit/undo 48h — de scris.
**Frontend (ecrane IDENTICE cu screenshot-urile, §9)** — 🧪 toate scrise + parse curat; de testat pe device
- ✅ **People list** `[PEOPLE-LIST]` (`PeopleListScreen.js`: header chat/bell/avatar, search debounce, My Teams chip + „+", N Results + sort, listă avatar+nume, paginare infinită).
- ✅ **Sort** `[PEOPLE-SORT]` (`PeopleSortMenu.js`: First/Last name, A-Z/Z-A).
- ✅ **Filter sheet** `[PEOPLE-FILTER]` (`PeopleFilterSheet.js`: Teams/Positions + checkbox + My Teams + Deselect All / Tags chip-uri / Permissions dropdown).
- ✅ **Quick-action** `[PEOPLE-QUICKACTION]` (`PersonQuickActions.js`: email/chat/telefon + Vezi profilul).
- ✅ **Profile** `[PROFILE]` (`ProfileScreen.js`: X/pencil/dots + avatar + TEAMS + Schedule/Blockouts/Messages + Help/Settings).
- ✅ **My Teams** `[MY-TEAMS]` (`MyTeamsScreen.js`: carduri echipă + poziții + labels).
- ✅ **Edit Contact Info** `[EDIT-CONTACT]` (`EditContactScreen.js`: nume + emails + phones+EnableText + add).
- ✅ **Settings** `[SETTINGS]` (`PcSettingsScreen.js`).
- ✅ **Account/Exit sheet** (Profilul meu + Ieși din Planificare).
- 🔨 **Add person** (FAB „+", perm-gated) — de adăugat (acum „+" deschide Filter, ca în PCO).
- ⬜ **Import UI** (ecran import CSV + preview).
- ⏸️ **Stub-uri** Schedule/Plans/Songs/Media (`ComingSoon`) — ecrane placeholder stilizate; se umplu la feliile lor.

### Faze ulterioare (scope-ul final = TOT; doar ordinea)
- ⬜ **Services core** (service types/plans/order/teams/scheduling manual/accept-decline/songs/chord-transpose).
- ⬜ **Calendar** (rooms/resources/bookings/anti-double-booking).
- ⬜ Scheduling avansat (auto-scheduler/matrix), forms/automations/lists/workflows, files/media/songs-avansat/audio-transpose.
- ⏸️ Services LIVE, Reporting (CCLI), dashboards, mobile polish (widgets/CarPlay/offline) — amânate explicit.
