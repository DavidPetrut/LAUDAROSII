# PRODUCTION - Ghid de Deployment

## @TEST-DATA: PRODUCTION NEXT

Cauta în tot proiectul comentariile `@TEST-DATA: PRODUCTION NEXT` pentru a gasi toate locurile care trebuie modificate înainte de deployment.

---

## Locații de verificat:

### 1. `app/global/config.js`

Schimba URL-urile din localhost în URL-uri production:

- `API_URL: "http://localhost:3000/api"` → `"https://api.laudarosii.ro/api"`
- `SOCKET_URL: "http://localhost:3000"` → `"https://api.laudarosii.ro"`
- `APP_URL: "http://localhost:8081"` → `"https://app.laudarosii.ro"`

### 2. Deep Linking

Link-urile share pentru formulare:

- Dev: `http://localhost:8081/prayers/form/{shareCode}`
- Prod: `https://app.laudarosii.ro/prayers/form/{shareCode}`

---

## Checklist Production

- [ ] Schimba URL-urile în `app/global/config.js`
- [ ] Configureaza CORS pentru domeniul production în server
- [ ] Testeaza deep linking cu URL-uri HTTPS
- [ ] Verifica ca modalul de rugaciuni se deschide automat la accesarea link-ului
