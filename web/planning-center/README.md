# Planning Center — Web (Songs)

Web app (Next.js) pentru modulul Planning Center. **One source of truth**: nu are DB proprie —
consumă exact rutele backend-ului Vertical (`server/`): `/api/pc/v1/...` + `/api/auth/login`.
Ce faci aici apare automat pe mobil (aceeași bază de date).

## Rulare în dev

1. Pornește backend-ul Vertical (din `server/`) — ascultă pe `:3000`.
2. În acest folder:
   ```bash
   npm install
   npm run dev
   ```
3. Deschide http://localhost:4100 (web-ul). Loghează-te cu **aceleași credențiale** ca în app.

Web-ul cheamă căi relative `/api/...`; Next le face proxy către backend (`PC_API_ORIGIN` din `.env.local`,
default `http://localhost:3000`). Zero CORS de configurat.

## Hosting (producție)

`npm run build && npm start` (sau orice host Next: Vercel / Render / VPS). Setează `PC_API_ORIGIN`
către originul API-ului de producție. Dacă web-ul e servit de pe același host cu API-ul, proxy-ul
devine same-origin natural.

## Arhitectură

- `app/` — rute (App Router). `(app)/` = shell autentificat (TopNav + conținut + bară AI).
- `lib/api/client.js` — SINGURUL loc prin care se vorbește cu backend-ul (Bearer token, proxy).
- `lib/auth/` — login cu tokenul backend-ului (JWT), ținut în localStorage.
- `lib/ai/` + `components/ai/` — **AI-first (§10)**: registry global de „suprafețe" (ce vede/face AI),
  provider, hook `useAiSurface`, bară de comandă omniprezentă (+ input vocal). Poarta e gata;
  funcționalitățile AI se adaugă „as we go", fără rearhitecturare.
- `components/shell/` — header identic PCO.

## Reguli (din arhitectură)

- **Identic vizual cu PCO** — culori/proporții/iconițe în `app/globals.css` (tokens), reglabile într-un loc.
- **Nimic inventat** în afara arhitecturii modulului. Un singur folder-părinte: `web/planning-center/`.
- **PDF (sequence/lyrics „create PDF") = ULTIMUL** (după prima parte).
