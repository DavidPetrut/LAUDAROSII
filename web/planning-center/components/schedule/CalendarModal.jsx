"use client";
/**
 * „Adaugă în calendar" — modal precompletat din orele planului (repetiție + slujire). Creează mai multe
 * evenimente deodată. Google = OAuth (scrie direct în calendar). Apple/alt = fișier .ics descărcabil.
 */
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { plansApi, integrationsApi } from "@/lib/api/client";
import Skeleton from "@/components/ui/Skeleton";

const fmt = (iso) => { try { return new Date(iso).toLocaleString("ro-RO", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return iso; } };
const icsDate = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
function buildIcs(events) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vertical//PC//RO", "CALSCALE:GREGORIAN"];
  for (const e of events) L.push("BEGIN:VEVENT", "UID:" + Math.random().toString(36).slice(2) + "@vertical", "DTSTAMP:" + icsDate(new Date().toISOString()), "DTSTART:" + icsDate(e.start), "DTEND:" + icsDate(e.end || e.start), "SUMMARY:" + esc(e.summary), "DESCRIPTION:" + esc(e.description), "END:VEVENT");
  L.push("END:VCALENDAR");
  return L.join("\r\n");
}

export default function CalendarModal({ planId, onClose, flash }) {
  const [events, setEvents] = useState(null);
  const [serviceType, setServiceType] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    plansApi.calendarPrefill(planId).then((r) => { setServiceType(r.serviceType || ""); setEvents((r.events || []).map((e) => ({ ...e, include: true }))); }).catch(() => setEvents([]));
    integrationsApi.googleStatus().then(setStatus).catch(() => setStatus({ connected: false, configured: false }));
  }, [planId]);

  const selected = (events || []).filter((e) => e.include);
  const setEv = (i, patch) => setEvents((ev) => ev.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  async function connect() {
    try { const r = await integrationsApi.googleConnect(); if (r?.url) window.location.href = r.url; else flash?.(r?.error || "Google OAuth neconfigurat pe server."); }
    catch (e) { flash?.(e?.message || "Eroare."); }
  }
  async function addGoogle() {
    if (!selected.length) return flash?.("Selectează cel puțin un eveniment.");
    setBusy(true);
    try { const r = await integrationsApi.createEvents(selected.map((e) => ({ summary: e.summary, description: e.description, start: e.start, end: e.end, tz: "Europe/Bucharest" }))); flash?.(`Adăugat ${r?.created || 0} eveniment(e) în Google Calendar.`); onClose?.(); }
    catch (e) { flash?.(e?.message || "Eroare la Google Calendar."); } finally { setBusy(false); }
  }
  function downloadIcs() {
    if (!selected.length) return flash?.("Selectează cel puțin un eveniment.");
    const blob = new Blob([buildIcs(selected)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${(serviceType || "plan").replace(/[^\w]+/g, "-")}.ics`; a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <Modal title={`Adaugă în calendar${serviceType ? ` — ${serviceType}` : ""}`} width={520} onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={downloadIcs} disabled={!selected.length}>Descarcă .ics (Apple)</button>
          {status?.connected
            ? <button className="btn btn-primary" onClick={addGoogle} disabled={busy || !selected.length}>{busy ? "…" : "Adaugă în Google"}</button>
            : <button className="btn btn-primary" onClick={connect}>Conectează Google</button>}
        </>
      }
    >
      <div className="cm">
        {status && !status.connected && <div className="cm-note">{status.configured ? "Conectează-te cu Google o singură dată ca să scrii direct în calendarul tău. Până atunci poți folosi .ics." : "Google OAuth nu e configurat pe server (env). Poți folosi .ics (Apple/Google/Outlook)."}</div>}
        {status?.connected && <div className="cm-ok">✓ Conectat{status.email ? ` · ${status.email}` : ""}</div>}

        {events === null ? <Skeleton rows={3} /> : !events.length ? <div className="muted">Nicio oră pe acest plan. Setează orele în Times.</div> : (
          <div className="cm-list">
            {events.map((e, i) => (
              <label key={i} className={`cm-ev ${e.include ? "on" : ""}`}>
                <input type="checkbox" checked={e.include} onChange={(ev) => setEv(i, { include: ev.target.checked })} />
                <div className="cm-mid">
                  <input className="cm-sum" value={e.summary} onChange={(ev) => setEv(i, { summary: ev.target.value })} />
                  <div className="cm-when">{fmt(e.start)}{e.end ? ` – ${new Date(e.end).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", hour12: false })}` : ""}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .cm-note { background: var(--surface-2); border-radius: 8px; padding: 9px 11px; color: var(--text-dim); font-size: 12px; line-height: 1.5; margin-bottom: 10px; }
        .cm-ok { color: var(--product); font-size: 12.5px; margin-bottom: 10px; }
        .muted { color: var(--text-faint); font-size: 13px; }
        .cm-list { display: flex; flex-direction: column; gap: 6px; }
        .cm-ev { display: flex; align-items: center; gap: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; padding: 9px 11px; cursor: pointer; opacity: .55; }
        .cm-ev.on { opacity: 1; border-color: var(--border-strong); }
        .cm-mid { flex: 1; min-width: 0; }
        .cm-sum { width: 100%; background: transparent; border: none; color: var(--text); font-size: 14px; font-weight: 600; font-family: inherit; }
        .cm-when { color: var(--text-faint); font-size: 12px; margin-top: 2px; }
      `}</style>
    </Modal>
  );
}
