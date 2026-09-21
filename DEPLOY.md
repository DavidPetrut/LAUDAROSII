# DEPLOY — Laudăroșii Vertical / Vertical București

Ghid unic pentru livrare: iOS (App Store / TestFlight), Android, OTA și backend.

---

## 1. Identificatori (publici — nu sunt secrete)

| Ce | Valoare |
|---|---|
| Nume App Store (iOS) | **Vertical București** |
| Nume proiect / slug | Laudarosii Vertical / `laudarosii-vertical` |
| Bundle ID (iOS) / package (Android) | `com.laudarosii.vertical` |
| Apple Team ID | `89T5MG3WB9` |
| Apple ID (cont) | `sg.petrut@gmail.com` |
| App Store Connect App ID (ascAppId) | `6814520620` |
| EAS project ID | `8bfe8882-ed8b-43fd-8bac-c52aad997302` |
| EAS owner | `davidpetruttt` |
| Backend (producție) | `https://laudarosii-api.onrender.com` (Render) |
| Canal OTA testeri | `preview` |
| Versiune / runtime curent | `1.0.2` |

**Cheie App Store Connect API (secret — NU pe git):**
`C:\Users\DavidPetrut\Desktop\PROIECTE\PERSONALE\APPLE MOBILE\AuthKey_TS63R7HMRT.p8`
Key ID: `TS63R7HMRT` · Issuer ID: `e05a0cc5-58db-451f-9e13-d55445163733`
(configurate în `app/eas.json` → submit.production.ios; `.p8` e gitignored)

---

## 2. iOS — build + TestFlight

Pe Windows nu se poate build iOS local → doar în cloud EAS (consumă credite EAS).

**Build + submit automat la TestFlight** (folosește cheia API, fără parolă Apple):
```powershell
cd "C:\Users\DavidPetrut\Desktop\PROIECTE\PERSONALE\LAUDAROSII\app"
eas build -p ios --profile testflight --auto-submit-with-profile production
```
- La „Set up Push Notifications?" → **No** (push-ul APNs se adaugă separat — vezi §7).
- Certificatele se creează automat cu cheia API.
- Dacă auto-submit-ul dă „iTunes service key is empty", lasă build-ul să termine și trimite separat:
```powershell
eas submit -p ios --profile production --latest
```

Profilul `testflight` folosește canalul **preview** → aceleași OTA ca Android.

---

## 3. Android — build

```powershell
cd "C:\Users\DavidPetrut\Desktop\PROIECTE\PERSONALE\LAUDAROSII\app"
eas build -p android --profile preview
```
Rezultă un APK (internal) de instalat direct pe telefon.

---

## 4. OTA (update fără build) — admin dashboard

OTA-ul din **admin dashboard** (butoanele „OTA PREVIEW" și „FULL (GitHub + OTA)") rulează:
```
eas update --branch preview --environment preview --message "..." --non-interactive
```
**Fără `--platform` → updatează AUTOMAT și iOS, și Android** într-o singură apăsare. Nu e nevoie de modificări.

Manual (echivalent):
```powershell
cd "C:\Users\DavidPetrut\Desktop\PROIECTE\PERSONALE\LAUDAROSII\app"
eas update --branch preview --message "descriere"
```
> Testerii văd update-ul după ce **închid complet și redeschid** aplicația.

---

## 5. ⚠️ REGULĂ CRITICĂ: schimbări native → rebuild + bump versiune

- **Doar JS/stiluri/imagini** → OTA e suficient.
- **Pachet nativ nou / app.json / config** (ex: expo-audio, expo-clipboard, screen-orientation) → **build nou** + **bump `version` în `app.json`** (ex: 1.0.2 → 1.0.3).
- De ce bump: OTA-ul ajunge doar la build-urile cu **același runtime**. Dacă dai OTA cu cod ce cere un modul nativ nou peste un build vechi care nu-l are → **aplicația crapă**. Bump-ul de versiune izolează build-urile noi.

**Acum (v1.0.2):** codul folosește `expo-audio` (nu mai `expo-av`). Trebuie **rebuild iOS + Android pe 1.0.2** înainte de următorul OTA. Testerii instalează build-ul nou, apoi OTA merge normal.

---

## 6. Backend (Render)

- Rulează pe `https://laudarosii-api.onrender.com`. Build-urile de producție îl folosesc automat (`app/global/config.js`).
- Push în GitHub (din admin dashboard) → Render redeployează backendul dacă e conectat la repo.
- **Email broadcast** (super-admin) — setează o dată în env-ul Render:
  - `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
  - Până atunci push-ul merge, emailul e sărit elegant.

---

## 7. Testeri (100 persoane) — TestFlight

- **Internal testing** = max **100** testeri, DAR fiecare trebuie să fie user în App Store Connect (impractic pentru membri de biserică).
- **External testing** = până la **10.000**, prin **link public** sau email. Prima dată cere **Beta App Review** (~24h), apoi update-urile sunt instant.
- **Pentru 100 de membri → External testing cu link public** e calea corectă:
  1. App Store Connect → app → **TestFlight** → creezi un grup **External**.
  2. Adaugi build-ul, completezi „Test Information", trimiți la **Beta App Review**.
  3. După aprobare → activezi **Public Link** și îl distribui în biserică.

---

## 8. Push notifications (APNs) — de făcut separat

Push-ul (broadcast + notificări devotional) pe iOS are nevoie de o cheie **APNs**:
1. developer.apple.com → Certificates, Identifiers & Profiles → **Keys** → **+** → **Apple Push Notifications service (APNs)** → download `.p8`.
2. `eas credentials` → iOS → Push Notifications → încarcă cheia.
(Android: push-ul merge din build.)

---

## 9. Comenzi utile

```powershell
eas build:list                 # build-uri recente
eas build:view                 # status build
eas update:list --branch preview
npx expo-doctor                # verifică incompatibilități înainte de build
cd app; npx expo export --platform ios   # test bundle JS (șterge dist după)
```
