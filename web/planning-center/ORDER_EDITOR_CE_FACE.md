# Mashup Studio — CE FACE aplicația, pe faze (ghid de testare)

> Document viu, în română. Îl **actualizez la finalul fiecărei faze**. Scopul: la final intri și testezi tot
> odată, iar dacă ceva nu merge, știm imediat de ce fază ține.
>
> Aici scriu **ce face aplicația** (capabilități), NU pași „fă click aici, apoi colo". Tu testezi cum vrei;
> lista de mai jos îți spune ce *ar trebui* să poți face la fiecare nivel.
>
> Legenda stării: ✅ construit (de testat) · 🔜 urmează.

---

## Unde se vede (pe scurt)
- **Tab Order** al unui plan: lângă clema de fișiere, melodiile și medley-urile au un **buton ✎** → deschide **Mashup Studio** (ecran mare).
- **Mashup Studio**: stânga = melodia pe **secțiuni** (versuri curate, ca pe foaia finală), dreapta = **AI Assistant**, jos = bara de salvare.

---

## FAZA 0 — Fundații (invizibil, dar stă la bază) ✅
Nu are UI. A pus „țevăria" pe care se sprijină tot restul:
- O structură de date (**snapshot**) care ține o melodie editată **self-contained** (titlu, game, secțiuni, secvență, surse).
- Motor care transformă versurile+acordurile unei melodii în **blocuri de secțiune** editabile și înapoi, refolosind
  100% motorul ChordPro existent (nu s-a reinventat nimic).
- O colecție nouă în DB, **izolată** (`pc_tempSongs`), unde vor trăi clonele temporare — **separat** de biblioteca de melodii.
- **Ce poți „testa":** nimic vizibil. Dacă fazele de mai jos merg, fundația e bună.

## FAZA 1 — Mashup Studio, doar vizualizare ✅
Editorul se deschide și arată melodia frumos, fără să poți încă schimba nimic:
- Din Order, **✎** pe o melodie deschide Studio pe tot ecranul.
- **Stânga:** melodia pe secțiuni (Strofă, Refren, Bridge…), cu **versuri curate** (fără acorduri tehnice `[C]`),
  plus un **strip de secvență** sus (V1, C1, B1…).
- Sus: titlul, **gama**, BPM, metrul. Dreapta: panoul **AI Assistant**.
- Se închide cu **X** sau **Esc**.
- **Ce poți testa:** deschizi ✎ pe diverse melodii și vezi că afișează corect versurile și secvența. O melodie
  fără versuri salvate arată secțiunile din secvență. Un medley spune că editorul complet vine mai târziu.

## FAZA 2 — Editare (local, în editor) ✅
Acum poți modifica efectiv melodia în Studio. **Totul e doar în editor** până la Save (vezi Faza 3):
- **Reordonezi secțiuni** prin drag & drop (sau butoanele ↑/↓ de pe fiecare secțiune).
- **Ștergi** o secțiune, **duplici** o secțiune.
- **Redenumești** o secțiune (click pe eticheta ei) cu **autocomplete**: scrii „ve" → îți propune „Verse/Strofă",
  „ref" → „Chorus/Refren" etc. Sugestiile sunt tipurile **reale** folosite în biblioteca voastră.
- **Editezi versurile** unei secțiuni inline (format ca în Songs).
- **Adaugi o secțiune nouă** (buton „+ Adaugă secțiune" jos, sau „+" pe o secțiune ca să inserezi dedesubt) — tot cu autocomplete.
- **Undo / Redo**: **Ctrl+Z** anulează, **Ctrl+Shift+Z** (sau Ctrl+Y) reface. Butoanele ↶ ↷ sunt și sus.
- **Secvența se recalculează live** pe măsură ce schimbi blocurile.
- **AI Assistant (dreapta) e deja prezent:** vede TOT ce e în editor și **poate face** aceleași schimbări. Scrii o
  comandă (ex. „scoate ultimul bridge"), AI-ul **propune**, iar tu **confirmi** cu „Aplică". *(Execuția reală a
  comenzilor AI devine completă când se termină partea de server AI — Faza 7; până atunci butonul trimite comanda
  și arată răspunsul/propunerile dacă serverul le întoarce.)*
- **Ce poți testa:** intri în Studio, muți/ștergi/duplici/redenumești secțiuni, editezi versuri, adaugi secțiuni,
  apeși Ctrl+Z de câteva ori. Dacă închizi fără să salvezi, **nu se schimbă nimic** la melodie (vezi Faza 3).

## FAZA 3 — Salvare TEMPORARĂ (pe plan) ✅
Dă sens editării din Faza 2: poți **salva** versiunea editată, **doar pe acest plan**, fără să atingi originalul:
- În bara de jos, **„Salvează temporar"** devine activ când ai modificări. La salvare apare un **modal de confirmare**
  în mijloc: „Salvat temporar — apare în Order, Rehearse și pe foaia de producție; originalul rămâne neatins".
- Dacă **închizi cu modificări nesalvate**, apare un modal: **Salvează / Renunță / Rămâi aici**. „Renunță" = nimic
  nu se scrie (ca și cum n-ai atins nimic). „Salvează" = salvează apoi închide.
- După salvare, melodia din **Order** arată badge-ul **„editat"** și titlul/gama reflectă versiunea editată.
  La fel în **Rehearse** și pe **foaia de producție (PDF)** — secvența, titlul și versurile sunt cele editate.
- **„Șterge editarea"** (în Studio, când există o versiune temporară) readuce melodia la originalul din bibliotecă.
- În **Order**, sus, apare butonul **„Curăță temporare"** când planul are melodii editate temporar → șterge toate
  clonele temporare ale **acestui plan** (originalele nu sunt afectate). Cere confirmare.
- **Siguranță:** nimic din toate astea nu scrie în biblioteca de melodii. Totul stă într-o colecție izolată și e legat
  doar de acest plan. AI-ul poate face și el „salvează temporar" / „șterge editarea" (prin confirmare).
- **Ce poți testa:** editezi o melodie, dai „Salvează temporar", închizi, redeschizi — modificările sunt acolo.
  Verifici că în Order apare „editat", iar pe PDF-ul/Rehearse-ul planului se vede varianta editată. Verifici că
  melodia originală (în biblioteca Songs) e neschimbată. Testezi „Șterge editarea" și „Curăță temporare".

## FAZA 4 — Mashup real („Transition next song") ✅
Acum poți **uni mai multe melodii într-una singură** direct în Studio:
- În editor, jos, apare butonul **„Transition next song"**. Îl apeși → se deschide un picker care arată **ce melodie
  următoare** din Order va fi unită și o listă de **tipuri de tranziție** (Directă, Acapella, Instrumental,
  Vorbit/rugăciune, Fade — presetate, globale pe organizație; se pot adăuga tipuri custom).
- Alegi tipul → melodia următoare e **adusă toată** în editor, sub un **header de tranziție** (ex. „Directă → Melodia X").
  Melodia adusă **dispare din Order** (rămâne un singur rând — mashup-ul).
- **Header de mashup:** are titlu editabil, **BPM** și **metru** (dropdown), și o **secvență proprie** care se
  **populează dinamic** din secțiunile de sub el. Îl poți muta sus/jos (secvența se recalculează) sau șterge.
- **Titlul mashup-ului** devine automat „Melodie1 + Melodie2" (max 2 cuvinte per melodie, cu „+").
- **Gama** devine „A / B" când melodiile au game diferite (sau una singură dacă sunt la fel).
- Salvezi cu **„Salvează temporar"** (ca la Faza 3) — mashup-ul e tot temporar, pe acest plan.
- **Reversibil:** „Șterge editarea" (sau „Curăță temporare") desface mashup-ul ȘI **readuce melodiile unite** înapoi în Order.
- În **Order**, mashup-ul apare ca **un singur rând** cu badge **„mashup"**, titlu „A + B" și gama „A / B".
  În **Rehearse** și pe **PDF** apare cu secvența și versurile combinate.
- **Pe foaia finală (PDF/Preview producție):** mashup-ul arată, în interiorul rândului melodiei, **headerul de tranziție**
  (un singur header pt. tot mashup-ul, cu săgeată „↳", titlu, BPM și metru) + câte un **container de resurse per
  melodie-sursă** („Resurse — Melodia X", cu gama ei), listând **mp3-urile și documentele** fiecărei melodii unite.
  Containerele sunt neutre (fundal subtil + border gri), fără dungi colorate.
- **AI poate face mashup** și el: „unește melodia următoare", „șterge tranziția", „editează tranziția" (prin confirmare).
- **Ce poți testa:** pui 2 melodii una după alta în Order, deschizi ✎ pe prima, „Transition next song", alegi un tip,
  vezi că a doua se unește sub un header și dispare din Order. Salvezi temporar → un rând „mashup" cu „A + B" / „A / B".
  Muți/ștergi headerul. „Șterge editarea" → cele 2 melodii revin separate în Order. Pe **Preview producție / PDF**
  verifici că apar headerul de tranziție și containerele de resurse per melodie-sursă.

## FAZA 5 — Replace & Save (suprascrie definitiv în bibliotecă) ✅
Până acum tot ce editai era temporar. Faza 5 adaugă prima salvare **definitivă** în biblioteca Songs:
- În bara de jos apare butonul **„Replace & Save"** — **doar la single-edit**. La **mashup butonul dispare complet**
  (nu poți suprascrie o melodie din bibliotecă cu un mashup de 2 melodii).
- Scrie **definitiv** versiunea editată peste aranjamentul din bibliotecă: **secvența** + **versurile/acordurile**
  (masterul ChordPro). Se vede în **TOATE** planurile viitoare care folosesc melodia. **Nu se poate anula.**
- **Confirmare „scrii titlul" (type-to-confirm):** se deschide un modal care arată titlul melodiei (cu buton de **copiere**)
  și un câmp unde trebuie să scrii **exact** titlul; butonul roșu „Suprascrie definitiv" se activează doar când se potrivește.
- **Nume nou (opțional):** un al doilea câmp îți lasă să **redenumești melodia** în bibliotecă (e aceeași melodie).
  Lași gol → titlul rămâne neschimbat.
- După suprascriere: **clona temporară dispare**, iar melodia de pe plan folosește direct aranjamentul **actualizat**
  (fără badge „editat" — acum e chiar versiunea din bibliotecă).
- **Siguranță:** operația cere permisiunea de editare a bibliotecii (`songs.edit`) pe server. Dacă n-ai modificări salvate,
  editorul le salvează întâi temporar, apoi suprascrie.
- **AI:** poate **propune** „Replace & Save" (deschide modalul de confirmare), dar **NU execută singur** — tu confirmi scriind titlul.
- **Ce poți testa:** editezi o melodie single, apeși „Replace & Save", copiezi/scrii titlul (opțional pui nume nou),
  suprascrii. Verifici în **biblioteca Songs** că aranjamentul chiar s-a schimbat. La un **mashup**, butonul nu apare deloc.

## FAZA 6 — Save as new (melodie nouă / aranjament nou) ✅
A treia cale de salvare: nu suprascrii nimic, ci **creezi ceva nou** în biblioteca Songs din versiunea editată.
- În bara de jos, butonul **„Save as new"** (activ la single ȘI la mashup) deschide un dialog cu două opțiuni:
  - **Melodie nouă** — o melodie **de sine stătătoare** în bibliotecă: îi creează aranjamentul, gamele, masterul de
    versuri/acorduri și **copiază fișierele** (mp3/linkuri) din original. La mashup, melodia nouă conține **tot** mashup-ul
    (blocurile combinate + fișierele tuturor surselor).
  - **Aranjament nou** — un aranjament **în plus sub o melodie existentă** (apare lângă celelalte aranjamente ale ei).
    La **mashup**, bifezi **care melodii-sursă** primesc aranjamentul nou (implicit toate bifate); fiecare bifată capătă
    o dublură de aranjament cu secvența/versurile combinate.
- **Nume automat fără coliziune:** scrii un titlu; dacă există deja unul la fel, primește sufix numeric incremental
  („Oceans" → „Oceans 2"). Dacă numele e liber, rămâne așa cum l-ai scris.
- **Copiere fișiere = prin referință** la același link (fără re-upload — nu umflă storage-ul).
- **Nu atinge nimic existent:** originalul rămâne neatins **și** editul temporar de pe acest plan rămâne (melodia nouă e
  ceva separat). Ștergerile din bibliotecă rămân „soft" (recuperabile), ca peste tot.
- **Permisiuni:** cere `songs.edit` pe server (ca Replace).
- **AI:** poate **propune** „Save as new" → deschide dialogul; **NU creează singur** — tu alegi tipul și confirmi.
- **Ce poți testa:** editezi/faci un mashup, „Save as new" → „Melodie nouă": verifici în biblioteca Songs că apare melodia
  nouă cu fișierele copiate. Apoi „Aranjament nou" (la mashup bifezi sursele): verifici că fiecare melodie bifată are un
  aranjament în plus. Verifici că numele primește „2/3…" când se repetă, și că originalul + editul de pe plan sunt intacte.

## FAZA 7 — AI complet (tool-use pe server) ✅
Până acum AI-ul **vedea** tot și putea propune, dar puntea de execuție depindea de server. Faza 7 o completează:
serverul AI face acum **tool-use** real — primește catalogul **live** de comenzi (chiar acțiunile editorului) + regulile
și întoarce **propuneri concrete** de acțiuni, cu argumente.
- În panoul **AI Assistant** (dreapta, în Studio) scrii o comandă în română — ex. „scoate ultimul bridge", „mută refrenul
  înainte de punte", „dublează prima strofă", „fă melodia la jumătate". AI-ul o traduce în **una sau mai multe acțiuni reale**.
- Propunerile apar cu buton **„Aplică"** (și **„Aplică toate"** când sunt mai multe), fiecare arătând și **argumentele**
  (ce bloc, ce poziție). **Tu confirmi** — AI-ul nu execută nimic singur (human-in-the-loop).
- AI-ul **citește tot** contextul editorului (blocuri cu id-uri, secvență, headere, surse, titlu, gamă) — fără `@mention` obligatoriu.
- **Reguli „foolproof" versionate în repo** (`lib/ai/rules/orderEditor.rules.json`) îl țin pe linie: nu inventează, nu atinge
  acordurile dacă nu ceri, 1 header per mashup, game „A / B", folosește id-uri, nu ghicește distructiv etc. **Comenzile** nu
  sunt o listă statică — vin **live** din acțiunile editorului (o singură sursă de adevăr), deci AI-ul are mereu exact ce poate editorul.
- Comenzile de **salvare** prin AI (temporar / Replace / Save as new) doar **deschid confirmarea** — rămâi tu la butoane.
- Rulează pe un model **ieftin** (Haiku) implicit. Dacă AI-ul nu e configurat pe server (lipsă cheie), panoul o spune clar.
- **Ce poți testa:** deschizi Studio, scrii comenzi în panoul AI, vezi propunerile (cu argumentele lor), aplici una sau toate
  și verifici că editorul chiar face schimbarea. O comandă imposibilă → AI-ul spune scurt ce lipsește, fără să strice nimic.
  *(Necesită cheia AI pe server.)*

## FAZA 8 — AI se antrenează (👍/👎 → lecții) ✅
AI-ul nu mai e „înghețat": îl corectezi din mers, iar corecțiile rămân pentru toată echipa.
- Fiecare propunere AI are acum două butoane mici: **👍** (bun) și **👎** (greșit). La **👎** poți scrie un **motiv scurt**
  (opțional, dar valoros). **👍** se salvează imediat.
- Verdictele devin **lecții GLOBALE pe organizație** (nu notițe personale — toți liderii beneficiază). La **următoarea
  comandă**, gateway-ul injectează aceste lecții în context: „**nu face așa**" (din 👎) și „**așa e bine**" (din 👍).
  Așa AI-ul se îmbunătățește în timp, **fără fine-tuning** — doar din feedback-ul vostru.
- Sub chat apare un panou pliabil **„Ce a învățat AI-ul aici"** cu lecțiile salvate (comanda + verdict + motiv). Le poți
  **șterge** (soft-delete, recuperabil ca peste tot).
- **Ce poți testa:** dai o comandă → apar propuneri; apeși **👎** pe una și scrii de ce; dai o comandă similară și vezi că
  AI ține cont de corecție. Deschizi panoul „Ce a învățat AI-ul aici", vezi lecțiile, ștergi una. *(Necesită cheia AI pe server.)*

> Notă: AI-ul **citește deja tot** ce e în editor (nu e nevoie de `@mention` ca să „vadă" o melodie sau un bloc — `@`-ul
> ar fi doar o comoditate de selecție, lăsată pentru lustruirea din Faza 9).

## FAZA 9 — Lustruire finală (animații, stări, responsive, dark, QA) ✅
Ultima fază nu adaugă funcții noi — face totul să arate și să se simtă premium, pe orice ecran și temă:
- **Animații discrete & respectuoase:** editorul și modalele intră lin. Dacă ai sistemul pe **„reduced motion"**,
  totul devine instant (fără animații/tranziții) — accesibil pentru cine e sensibil la mișcare.
- **Stări acoperite peste tot:** se încarcă (schelet), gol (element fără melodie / medley cu explicație), eroare (mesaj clar).
- **Responsive:** pe ecrane înguste panoul AI trece **sub** editor; pe **telefon** barele de sus/jos se împachetează,
  butoanele se întind pe lățime și **nimic nu iese din ecran**.
- **Dark + light:** toate culorile vin din tokens-urile temei (inclusiv verdele 👍 și roșul 👎), deci arată corect pe ambele.
- **Accesibilitate:** focus vizibil pe **orice** buton/câmp, etichete aria, Esc închide modalele pe rând.
- **Ce poți testa:** intră în Studio pe telefon și pe desktop, pe temă închisă și deschisă; verifică că nimic nu iese din
  ecran, că focus-ul se vede la Tab și că animațiile dispar dacă pui „reduced motion" în sistem.

---

## ✅ Gata — Mashup Studio complet (Faza 0 → 9)
Tot editorul e construit: vizualizare → editare → salvare temporară → mashup (+ foaia de producție) → Replace & Save →
Save as new → AI care propune acțiuni reale (tool-use) → AI care se antrenează din 👍/👎 → lustruire finală.
Acum poți intra și **testa totul deodată**; dacă ceva nu merge, secțiunile de mai sus îți spun de ce fază ține.
