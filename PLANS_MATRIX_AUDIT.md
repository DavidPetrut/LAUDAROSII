# Plans + Matrix — Audit DB + Schelet Import (web-first)

> Scop: baza de date = **destinație 1:1 a modelului PCO** (import flawless al istoricului de 5 ani),
> iar funcționalitățile NOASTRE noi (din transcriptul cu liderul) = **câmpuri aditive (nullable)** ca
> importul să nu se spargă niciodată. PCO va fi **înlocuit** → importul e o **migrare one-time,
> reutilizabilă** (o putem da altor biserici cu PCO). Design 1:1 cu screenshot-urile pe WEB.
>
> Referințe: `PLANNING_CENTER_ARCHITECTURE.md` (§ Services/Scheduling/Matrix #14–#24, [MATRIX]),
> `research_notes/.../plans_order_times_notes_files.md` (model API PCO v2, §12), transcriptul call-ului.

## 0. Regula de aur a importului
- **People** → export CSV în PCO (merge). **Plans / Service Types / Teams / Poziții / Programări /
  Times / Items / Notes / Needed / Blockouts / istoric** → NU au CSV → **API PCO Services v2**
  (`api.planningcenteronline.com/services/v2/`, Basic auth cu Personal Access Token de la org-admin, JSON:API).
- **`remoteId` pe FIECARE entitate importabilă** = id-ul PCO → import idempotent (upsert) + rezolvarea
  relațiilor (remoteId→localId). Fără asta, re-rularea importului dublează datele.

## 1. Audit entitate-cu-entitate (există → PCO → de adăugat)

### PcServiceType ✅ bază bună
Există: name, folderId(placeholder Object), frequency, serviceTimeTemplate, itemRowColors, useCustomRowColors, sortOrder, archived.
- **Import (lipsă):** `remoteId`, `folderId` → ref real `PcFolder`, `permissions`, `scheduledPublish`,
  `limitedFileVisibility` (attachment_types_enabled), `publicView` (14 booleans), `lastPlanFrom`, `deletedAt`.
- **Nou (lider):** nimic direct aici; `ministryGroup` se modelează pe echipă (vezi PcTeam).

### PcPlan ✅
Există: serviceTypeId, title, seriesId, sortDate, publicView.
- **Import:** `remoteId`, `remindersDisabled`, `seriesTitle`, `createdByPersonId`, `updatedByPersonId`,
  `deletedAt` (recover 30z), `publicBySchedule`.
- **Derivate la citire (nu stocăm):** counts (needed/people/items), prev/next, dates, total_length.

### PcPlanTime ✅
Există: planId, type(service/rehearsal/other), name, startsAt, endsAt.
- **Import (IMPORTANT — „times conduc totul"):** `remoteId`, `assignedTeamIds[]`, `assignedPositionIds[]`,
  `teamReminders` (Map teamId→zile 0–7), `recorded`/live times (opțional).
- **Feature:** `createInFuture` (flag UI la add; nu stocat neapărat).

### PcPlanItem ✅ bogat
Există: type, title, description, lengthSec, leaders[] (persoană/poziție), keyName, placement, duringAll, timeIds[], songId/arrangementId/keyId, mediaItemId, sequence[], rowColor, sortOrder.
- **Import:** `remoteId`, `htmlDetails` (tab „Detail" rich-text), CCLI reporting (per song item),
  `itemTimes` (exclude/offset per service time — pt. „exclude item from a time").
- **Note item:** PCO le ține separat pe categorii → **PcItemNote** (vezi entități noi) SAU map embedded
  `notesByCategory`. Recomand separat pt. fidelitate.

### PcAssignment ✅✅ (cel mai complet — are deja prepared/repliesTo/responseToken/istoric declin/guest/tempPosition)
Există: planId, teamId, positionId, personId, timeIds[], status, source, declineReason, prepared, repliesToPersonId, notes, isGuest, isTemporaryPosition, tempPositionName, notificationSentAt, responseToken, acceptedAt, declinedAt, declinedAfterConfirm.
- **Import:** `remoteId`, `scheduledByPersonId`, `preparedAt`, `sentAt`(=notificationSentAt), `readAt`,
  `replacementPersonId` (fluxul de înlocuire — lider #6).
- **Nou (lider):** statusul „declin păstrat pt. istoric" + replacement = acoperit cu
  `replacementPersonId` + `declinedAfterConfirm` (deja). Timeline Prepared/Sent/Read/Pending = câmpurile de mai sus.

### PcNeededPosition ⚠️ minimal
Există: planId, teamId, positionId, count.
- **Import:** `remoteId`, `timeId` (needed per service time), `timePreferenceOptionId` (split teams).
- **Nou (lider #7):** „Needed" ascuns de userii normali = regulă de **vizibilitate la citire** (nu schemă):
  GET-urile pentru rol < scheduler NU includ needed/celule goale.

### PcTeam ⚠️ (flags ok, dar lipsesc multe)
Există: name, serviceTypeId, flags(rehearsal/secure/split/tag), sortOrder, archived.
- **Import:** `remoteId`, `repliesToMode` (currentScheduler/allLeaders/person), `onDecline`
  (doNotReschedule/manual/replacement/autoSchedule/signup), `scheduledViewerAccess` (fullPlan/myScheduleOnly),
  `defaultStatus`, `defaultPrepared`, `relatedTeamIds[]`, `serviceTypeIds[]` (multi, PCO 2026).
- **Nou (lider #3 — grila People→asignare):** cele **5 slujiri mari** (Asimilare, Laudă și Închinare,
  Vertical Kids, Media, Creative) = **grupuri de nivel 1**; echipele/pozițiile actuale = sub-nivel.
  Adaug `ministryGroup` (String/ref) ca să grupăm echipele în cele 5 taburi mari. La import îl derivăm din
  structura PCO (folder/service type/nume), ajustabil manual.

### PcPosition ⚠️ minimal → aici intră MULTE funcționalități noi
Există: teamId, name, sortOrder.
- **Import:** `remoteId`, `fileTags[]` (limited file visibility).
- **Nou (lider #1/#2/#13):**
  - `defaultGender`: `"M"|"F"|"any"` → filtru pre-selectat (parcare=M, etc.).
  - `defaultProgram`: `"1"|"2"|"any"` (SIM/program) → filtru pre-selectat.
  - `recommendRule`: reguli de recomandare (ex. target „2×/lună") → sortarea listei din dreapta.
  - `instructions`: text „manual" per poziție (onboarding: ce faci la poziția asta) → in-app+email+push.

### PcPerson ✅ (are deja `gender`, `remoteId`)
Există: nume complet, gender(M/F/""), birthdate, maritalStatus, emails/phones/addresses, householdId, membershipTypeId, campusId, status(active/inactive), inactiveReason, child, avatar, tagIds, anniversary, notes, remoteId, accessIntent, userId.
- **Import:** suficient (CSV + API mapează). Adăugăm `remoteId` deja există.
- **Nou (lider):**
  - `programIntent`: `"1"|"2"|""` — intenția „(1)/(2)" din nume → atribut filtrabil (nu text în nume).
  - `schedulingStatus`: `"available"|"onBreak"|"suspended"` — „blocat de noi" → **ascuns din TOATE listele**
    de asignare (lider #9). Diferit de inactive (acela = plecat din biserică).
  - Guest one-time: rămâne pe **assignment** (`isGuest`), NU creăm pc_person pt. invitați (lider #9).
  - Foști membri: `status:"inactive"` + mutare în zonă „plecați" (ascuns din liste); delete permanent = org-admin.

### PcBlockout ✅
Există: personId, startDate, endDate, allDay, startTime, endTime, repeat, reason.
- **Import:** `remoteId`, `setByPersonId` (cine l-a pus).
- **Nou (lider #5/#9):** `type`: `"personal"|"churchBlock"` (churchBlock = „blocat de noi", albastru, pus de planificator).
  Regula strictă: blockout peste o programare cu **email trimis** = interzis (vorbești pt. schimb); altfel → auto-declin.

## 2. Entități NOI de adăugat (lipsesc vs PCO)
- **PcFolder** — folder → campus → timezone; nested (parentId). Necesită pt. pagina Plans + import + tz reminders.
- **PcSeries** — title + artwork (plan.seriesId îl referă deja).
- **PcPlanTemplate** — name, items[], notes[], team members[], needed[]; **fără times**. Pt. „Add plan → template" + import.
- **PcItemNote** — per item, pe categorie (sau embedded `notesByCategory` pe PcPlanItem).
- **PcNoteCategory** — categorii de note item + plan, per service type (admin le definește).
- **PcSchedulingPreference** — per persoană per echipă (disponibilitate soft; max/lună, weeks-of-month…).
- **PcTimePreferenceOption** — orele service type (pt. split teams).
- **PcContributor** (opțional) — audit modificări plan (cine/ce/când).
- **PcReportTemplate** (ulterior) — rapoarte custom.

## 3. Arhitectura importer-ului (migrare PCO → noi, reutilizabilă)
Modul separat: `server/planning-center/services/pcoImport/` (+ UI de admin pe web, gated org-admin).
- **Input:** PCO Personal Access Token (`appId:secret`, Basic auth) SAU OAuth; `orgId` țintă la noi.
- **Transport:** JSON:API — parse `{data, included, relationships, links.next}`, paginare `per_page=100`,
  back-off la rate-limit (429), reluare.
- **Ordine pull (respectă dependențele FK):**
  1. Organization + Campuses + Folders
  2. ServiceTypes (+ note categories, time preferences, public_view)
  3. Teams + TeamPositions
  4. People (+ emails/phones/addresses/households/membership) — SAU din CSV
  5. TeamMembers (roster) + SchedulingPreferences
  6. Series
  7. Plans (filtre `past` + `future`, paginat — TOT istoricul) + PlanTimes
  8. Items (+ ItemNotes, ItemAssignments/leaders, ItemTimes)
  9. Assignments (PlanPeople: status + notification_* + replacement) + NeededPositions
  10. PlanNotes
  11. Blockouts
  12. PlanTemplates
- **Mapare:** fiecare vertex PCO → model al nostru; stocăm `remoteId`; rezolvăm relațiile prin
  hartă `remoteId→localId` (per colecție). **Upsert idempotent pe (orgId, remoteId)**.
- **Raport:** per colecție — create/update/skip/error; dry-run; reluabil.
- **Reutilizabil:** zero hardcodări de biserică; input = token + orgId; output = date în schema noastră.

## 4. Vizibilitate (reguli la citire, nu schemă) — din transcript
- Rol < scheduler: NU vede celulele „Needed"/goale, nici oameni cu `schedulingStatus≠available`, nici
  programări netrimise (prepared).
- Listele de asignare: ascund `schedulingStatus onBreak/suspended` + `status inactive`.
- Conflicte = DOAR warning (galben=ore suprapuse, roșu=blockout, „+N"), FĂRĂ reguli combinate automate.

## 5. Ce NU schimbăm acum (seam, dar lăsăm loc)
Auto-scheduler, signup sheets, background checks, stage layouts, LIVE, reports builder, forms/automations.
Toate au deja seam în arhitectură; schema le lasă loc (câmpuri nullable).
