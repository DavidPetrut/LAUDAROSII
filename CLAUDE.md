# Reguli proiect — Laudăroșii

## DESIGN — ORDIN PERMANENT
La **ORICE** lucru de UI (pagină, componentă, container, culoare, layout, spacing, animație), folosește MEREU, din prima, fără să ți se amintească:

1. **UI/UX Pro Max** (skill `ui-ux-pro-max` din `~/.claude/skills/`, rulat prin `scripts/search.py` — sau nativ dacă e în listă) — **ACESTA conduce designul**: stil, paletă, ierarhie, spacing, micro-UX. Interoghează-l înainte să proiectezi, nu improviza.
2. **21st** (`mcp__21st__*`: `search` → `get`, sau `generate`; ori CLI `npx @21st-dev/cli`) — referințe și componente moderne.

Obiectivul: design **modern, premium** — gata cu „minimum bars" / improvizat. David a luat aceste tool-uri exact ca să nu mai stea el să inventeze designul.

**DESIGN.md NU mai e autoritate rigidă** — e doar referință ușoară pentru temă/identitate. Dacă tool-urile propun ceva mai bun, mergi pe el.

**Singura constrângere de coerență:** păstrează tokens-urile de temă ale aplicației (dark mode + culorile din `web/planning-center/app/globals.css`) ca UI-ul nou să nu bată cu restul. În rest, lasă tool-urile să conducă.

**Stack:** web = Next.js (JS, App Router) la `web/planning-center` (port 4100), **styled-jsx + tokens** (NU shadcn/Tailwind). Componentele 21st (React+Tailwind) = inspirație → le **adaptezi** la stilul nostru. Acoperă mereu stările (loading / empty / error) + light & dark + ambele breakpoints.

## ICONURI — REGULA SUPREMĂ
**Iconurile se iau EXCLUSIV din Phosphor** (`@phosphor-icons/react`, instalat în `web/planning-center`). NICIODATĂ alt set, nimic „basic/urât/free random", niciun emoji ca iconiță funcțională.
- **Alegerea iconiței** = fie recomandată de **UI/UX Pro Max** (domeniul `icons`), fie **o gândesc eu** una frumoasă/potrivită pentru designul lui David — nu la întâmplare, ci cu intenție de design.
- **Cum se folosește:** `import { NumeIcon } from '@phosphor-icons/react'`, `<NumeIcon size={…} weight="…" />`. Greutăți disponibile: `thin | light | regular | bold | fill | duotone`. **Duotone** = accentul nostru premium (dă profunzime); folosește-l pentru iconuri-vedetă. Culoarea MEREU din tokens (`currentColor` / var-uri din `globals.css`), nu hardcodată.
- Pe mobil (React Native) rămân seturile existente; regula Phosphor e pentru WEB.

## Alte reguli (detalii în memorie)
- Backend `server/` NU e hot-reload → după modificări, restart `node index.js`.
- DB (MongoDB) = READ-only fără instrucțiune scrisă explicită în chat.
- Fără emailuri/notificări autonome către oameni reali.
- Fără subagenți — tot în chatul curent.
