# Design system — „al nostru" (Planning Center web + mobil)

Scop: fiecare funcționalitate arată consistent și „wow" din prima, fără runde de corecturi.
Citește ÎNAINTE de a construi orice UI nou. Dacă ceva nu e aici, imită cel mai apropiat pattern existent și extinde documentul.

## Principii (nenegociabile)
1. **Carduri, nu linii.** Listele de entități (ore, alerte, note, persoane…) = carduri fine delimitate, NU rânduri cu `border-bottom` care le desparte. Pe web folosește clasa `.pc-card` (`+ .pc-card-hover` dacă e clicabil). Containerul dă `gap`/spacing; cardul dă delimitarea.
2. **Premium & minimalist.** Colțuri rotunjite (8–12px), borduri subtile (`--border`), spațiere generoasă dar fără gol inutil. Fără overcrowd. Un singur accent de culoare per zonă.
3. **Tranziții subtile.** hover = `border-color` + `translateY(-1px)`; apariții = fade/scale .14–.18s. Niciodată animații stridente.
4. **Tokens, mereu.** Culori DOAR din `globals.css` (`--primary` albastru, `--product` verde, `--danger`, `--surface/-2/-3`, `--text/-dim/-faint`, `--border/-strong`). Zero hex hardcodat (excepție: culorile de zi din backend).
5. **Ierarhie clară.** Titlu bold > meta `--text-dim` > hint `--text-faint`. Numere cu `font-variant-numeric: tabular-nums`.
6. **Butoane frumoase, nu mari.** `.btn`/`.btn-primary`/`.btn-ghost`. Primary doar pentru acțiunea principală. Fără butoane uriașe pline.
7. **Modale/pop-up** centrate, `max-width`, overlay cu blur ușor, animație de intrare. Primitivă: `components/ui/Modal`.
8. **Paritate mobil** cu același limbaj vizual (card, badge, spacing), adaptat la RN (`pcColors`, StyleSheet).

## Cardul standard (`.pc-card`)
```jsx
<div className="pc-card pc-card-hover">…</div>
```
Layout tipic pe un card cu „badge + meta sus, detaliu jos":
- Rândul de sus (flex, `align-items:center`): [badge] [valoare principală] … [meta dreapta cu `margin-left:auto`]. TOATE pe primul nivel, aliniate sus.
- Detaliul lung (ex. nume) pe rândul următor, full-width, se wrapează natural. NU îl lipi cu „ · " de valoarea de sus.

Exemplu real: cardul de Times (`app/(app)/plans/[id]/page.jsx`, `.tcard`): sus = badge zi (DUM/SÂM, colorat) + interval oră + data (dreapta); jos = numele slujbei pe rând separat.

## Badge-uri de zi
3 litere RO + culoare per zi (din backend `weekdayColor`). `flex:none`, aliniat cu valoarea de pe primul rând (nu centrat pe tot cardul).

## Chips (selecție)
Pill `border-radius:999px`, inactiv = `--surface-2`/`--border-strong`/`--text-dim`; activ = `--primary` fundal + text alb bold. Hover = `--text` + `--primary` border.

## Zone de upload
Drop-area cu bordură `dashed`, „＋" centrat + text, hover/drag = `--primary` + fundal `rgba(primary,.06)`. Fără selectoare de tip fișier.

## Încărcare (skeleton)
- Orice loc care încarcă date din API (modale, taburi, liste) afișează `<Skeleton/>` (shimmer), NU text „Se încarcă…". `import Skeleton from "@/components/ui/Skeleton"`; variante: `lines={n}` (bare) sau `rows={n}` (avatar + 2 linii, pt. liste de persoane/carduri). Clase globale `.pc-sk-*` + `@keyframes pc-shimmer` în globals.css.
- Skeleton-ul e legat de starea REALĂ de încărcare (ex. `data === null` / `loading`) → apare DOAR cât timp datele n-au ajuns și dispare instant când ajung. NU pune delay artificial / minim de afișare; dacă se încarcă rapid, dispare rapid.
- Excepție: butoanele de acțiune „busy" (upload în curs) rămân text, nu skeleton — nu e încărcare de date.

## Empty states
Scurt, `--text-faint`, eventual cu o acțiune („+ setează", „din template"), nu paragrafe.

## Proces (cum lucrăm)
- **NU întreba de confirmări de design.** Implementează după regulile de aici și lasă-l pe David să zică dacă îi place sau nu. Fără „commit sau ajustez?" pe design.
- Când David zice **„îmi place designul, ține minte"** = COMANDĂ să adaug pattern-ul aici în DESIGN.md. Dacă e deja aici, e doar un approve (ignoră). Dacă nu, scrie exact cum îi place.

## Modale & overlay
- Mereu DEASUPRA conținutului: `Modal` are `z-index:1000` + overlay cu blur. Niciun conținut (Order, drawer) nu trebuie să treacă peste modal.
- Centrat, `max-width`, animație de intrare, titlu SCURT și corect (numele real al secțiunii — ex. „Notes", nu „Note — view-uri țintite").

## Liste de entități editabile (view-uri, secțiuni…)
- Carduri **colapsabile**: header = titlu + rezumat pe un rând (audiență/meta); colapsate by default; click pe header = expand pentru editare.
- Reordonare prin **drag** (prioritate; sus = mai puternic), cu handle `⋮⋮`.
- Icon de settings = SVG cog într-un buton (nu glyph „⚙" mic).

## Textarea
- Generos: `min-height ~96px`, `resize: vertical`, `overflow-y:auto` (scroll), NU minuscul care trebuie tras manual. Lățime = 100% din container, nu mai lat decât modalul.

## Liste de persoane (seen/not-seen, roster…)
- Rând = avatar + nume (flex, truncate) + **status la dreapta de tot** ca pill cu iconiță (✓ Văzut verde / ✕ Nevăzut gri). Spațiere comodă; NICIODATĂ glyph lipit de nume.
- Avatarul aliniat pe centru cu numele. Unde userul își vede secțiunea lui (ex. „Rolul meu"), pune avatarul lui pe același rând cu titlul.

## Order — voci & gamă
- Voci: doar PRENUMELE (primul cuvânt) cu MAJUSCULE; separatorul între roluri = ` || ` (nu `--`). Format: `Suport: X || Alto: Y || Tenor: Z`. Etichetele (Suport/Alto/Tenor) rămân normale.
- Badge de gamă (G, D, Am…) = pill ROTUND FILLED + text alb, COMPACT (padding mic ~1px 8px) dar font ~13px (doar scrisul mai mare, nu pastila). Verde cântec = `#6fa02e` (NU `--product`/`#86c13f` — prea shiny); media = `--primary`. NU border pătrat.
- Lead: avatarul persoanei (rotund, PersonAvatar → avatar sau inițiale; inițialele scalează singure cu mărimea, ~33px web / 30 mobil), pe rândul titlului, după badge-ul de gamă, bine despărțit (~20px).

## Pickere dependente de selecție
- Când selectezi echipă → rol → oameni, FILTREAZĂ lista la ce se potrivește (oamenii cu rolul ales din echipa aleasă). NICIODATĂ nu arăta toată lumea.

## Checklist înainte de „gata"
- [ ] Liste = `.pc-card`, zero `border-bottom` separator.
- [ ] Primul rând aliniat sus; detaliul lung pe rând nou, wrap.
- [ ] Doar tokens; numere tabular.
- [ ] hover/tranziții subtile; un singur accent.
- [ ] Mobil: același limbaj.
