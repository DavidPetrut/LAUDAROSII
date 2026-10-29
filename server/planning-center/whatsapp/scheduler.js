/**
 * Scheduler WhatsApp (Faza 3) — face modul „Automat" să ruleze SINGUR.
 * Ca `broadcastService`: un setInterval pornit din server/index.js, DOAR local (flag WHATSAPP_BRIDGE=1).
 * La fiecare ciclu aplică din Matrix grupurile pe mod „auto" (vezi routes/whatsapp.runScheduledSync).
 *
 * „Săptămânal" în practică = verificăm des (la 6h) și acționăm DOAR când e o schimbare reală:
 * offset-ul e relativ la azi, deci când trece o dată de slujire, ținta devine singură următoarea săptămână →
 * la următorul ciclu se aplică. Dacă nu e nimic de schimbat, nu se scrie nimic pe WhatsApp (doar citiri).
 */
const EVERY_MS = 6 * 60 * 60 * 1000; // la fiecare 6 ore
const FIRST_MS = 60 * 1000;          // prima rulare la ~1 min după pornire
let timer = null;
let running = false;

async function tick() {
  if (running) return;               // nu suprapune cicluri
  running = true;
  try {
    const wa = require("../routes/whatsapp");
    const r = await wa.runScheduledSync();
    if (r?.skipped) return;          // punte neconectată / fără org — tăcut
    if (r?.applied) {
      console.log(`[whatsapp] auto-sync: ${r.applied}/${r.count} grupuri aplicate`,
        r.results.filter((x) => !x.skipped && !x.error).map((x) => `${x.name || x.jid}:+${x.added?.length || 0}/-${x.removed?.length || 0}`));
    }
    const empties = (r?.results || []).filter((x) => x.emptyMatrix);
    if (empties.length) console.log(`[whatsapp] auto-sync: ${empties.length} cu Matrix gol (golite — așteaptă planificarea userului)`);
  } catch (e) {
    console.error("[whatsapp] scheduler tick:", e.message);
  } finally {
    running = false;
  }
}

function startWhatsappScheduler() {
  clearInterval(timer);
  setTimeout(tick, FIRST_MS);
  timer = setInterval(tick, EVERY_MS);
}

module.exports = { startWhatsappScheduler };
