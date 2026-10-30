"use client";
/**
 * ServiceTypeSettingsModal — setările unui service type (web), stil PCO premium.
 * Secțiuni: General (nume/frecvență) · Publicare (schedule publish + public view) ·
 * Fișiere (limited file visibility) · Categorii de note (item/plan) · Tipuri de item.
 *
 * Totul e aditiv & compatibil cu importul PCO (câmpuri nullable pe PcServiceType +
 * colecția pc_noteCategories). Categoriile de note se salvează imediat (au id propriu);
 * restul se salvează cu „Salvează" (PATCH). ZERO email, doar DB.
 */
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { servicesApi, teamsApi } from "@/lib/api/client";
import Skeleton from "@/components/ui/Skeleton";

const FREQ = [
  ["weekly", "Săptămânal"], ["everyOtherWeek", "La două săptămâni"], ["monthly", "Lunar"],
  ["daily", "Zilnic"], ["everyWeekday", "În fiecare zi lucrătoare"], ["randomly", "Ocazional"],
];
const WD = [["", "—"], ["0", "Duminică"], ["1", "Luni"], ["2", "Marți"], ["3", "Miercuri"], ["4", "Joi"], ["5", "Vineri"], ["6", "Sâmbătă"]];
const WOM = [["0", "Fiecare"], ["1", "Prima"], ["2", "A doua"], ["3", "A treia"], ["4", "A patra"], ["-1", "Ultima"]];
const HHMM = /^\d{1,2}:\d{2}$/;
const PV_LABELS = {
  dates: "Date", serviceTimes: "Ore de serviciu", planTitles: "Titluri planuri", series: "Serii",
  items: "Elemente (order)", itemLengths: "Durate elemente", itemDescriptions: "Descrieri elemente",
  songs: "Cântece", songDetails: "Detalii cântec", media: "Media", files: "Fișiere",
  teams: "Echipe", scheduledPeople: "Persoane programate", planNotes: "Note plan",
};

function Toggle({ on, onChange, label, hint }) {
  return (
    <button type="button" className={`tg ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <span className="tg-sw"><span className="tg-dot" /></span>
      <span className="tg-tx"><span className="tg-l">{label}</span>{hint ? <span className="tg-h">{hint}</span> : null}</span>
      <style jsx>{`
        .tg { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; background: transparent; border: none; cursor: pointer; padding: 6px 0; }
        .tg-sw { width: 34px; height: 20px; flex: none; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 20px; position: relative; transition: background .16s, border-color .16s; }
        .tg-dot { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--text-faint); transition: transform .16s, background .16s; }
        .tg.on .tg-sw { background: rgba(47,129,247,.25); border-color: var(--primary); }
        .tg.on .tg-dot { transform: translateX(14px); background: var(--primary); }
        .tg-tx { display: flex; flex-direction: column; }
        .tg-l { color: var(--text); font-size: 13px; }
        .tg-h { color: var(--text-faint); font-size: 11px; margin-top: 1px; }
      `}</style>
    </button>
  );
}

export default function ServiceTypeSettingsModal({ serviceType, onClose, onSaved, initialData = null }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);           // forma de la server
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [schedulePublish, setSchedulePublish] = useState(false);
  const [limitedFiles, setLimitedFiles] = useState(false);
  const [pv, setPv] = useState({});
  const [pvKeys, setPvKeys] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [noteCats, setNoteCats] = useState([]);
  const [newType, setNewType] = useState({ name: "", color: "#2f81f7" });
  const [newCat, setNewCat] = useState({ item: "", plan: "" });
  // Recurență + Repetiție template
  const [recDay, setRecDay] = useState("");
  const [recWeek, setRecWeek] = useState("0");
  const [reh, setReh] = useState({ enabled: false, dayOffset: 1, start: "", end: "", visibleToTeamIds: [], visibleCapability: "" });
  const [teams, setTeams] = useState([]);

  const apply = (d) => {
    setData(d);
    setName(d.name || ""); setFrequency(d.frequency || "weekly");
    setSchedulePublish(!!d.scheduledPublish); setLimitedFiles(!!d.limitedFileVisibility);
    setPv(d.publicView || {}); setPvKeys(d.publicViewKeys || []);
    setItemTypes(d.itemTypes || []); setNoteCats(d.noteCategories || []);
    setRecDay(d.recurringDayOfWeek === 0 || d.recurringDayOfWeek ? String(d.recurringDayOfWeek) : "");
    setRecWeek(String(d.recurringWeekOfMonth || 0));
    const t = d.rehearsalTemplate || {};
    setReh({ enabled: !!t.enabled, dayOffset: Number.isFinite(t.dayOffset) ? t.dayOffset : 1, start: t.start || "", end: t.end || "", visibleToTeamIds: (t.visibleToTeamIds || []).map(String), visibleCapability: t.visibleCapability || "" });
  };

  useEffect(() => {
    let alive = true;
    teamsApi.manage(serviceType.id).then((r) => { if (alive) setTeams((r?.teams || []).map((t) => ({ id: String(t.id), name: t.name }))); }).catch(() => {});
    if (initialData) { apply(initialData); setLoading(false); return; } // preview/test (producția nu-l pasează)
    setLoading(true); setErr("");
    servicesApi.get(serviceType.id).then((d) => { if (alive) apply(d); })
      .catch((e) => alive && setErr(e?.message || "Eroare la încărcare."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType.id]);

  const toggleTeam = (id) => setReh((s) => ({ ...s, visibleToTeamIds: s.visibleToTeamIds.includes(id) ? s.visibleToTeamIds.filter((x) => x !== id) : [...s.visibleToTeamIds, id] }));

  async function save() {
    setBusy(true); setErr("");
    try {
      await servicesApi.patch(serviceType.id, {
        name: name.trim(), frequency, scheduledPublish: schedulePublish,
        limitedFileVisibility: limitedFiles, publicView: pv, itemTypes,
        recurringDayOfWeek: recDay === "" ? null : parseInt(recDay, 10),
        recurringWeekOfMonth: parseInt(recWeek, 10) || 0,
        rehearsalTemplate: { ...reh, dayOffset: parseInt(reh.dayOffset, 10) || 0 },
      });
      onSaved?.({ id: serviceType.id, name: name.trim() });
      onClose?.();
    } catch (e) { setErr(e?.message || "Eroare la salvare."); }
    finally { setBusy(false); }
  }

  async function addCat(kind) {
    const nm = (newCat[kind] || "").trim();
    if (!nm) return;
    try {
      const c = await servicesApi.addNoteCategory(serviceType.id, { kind, name: nm });
      setNoteCats((l) => [...l, c]);
      setNewCat((s) => ({ ...s, [kind]: "" }));
    } catch (e) { setErr(e?.message || "Eroare la categorie."); }
  }
  async function delCat(catId) {
    try { await servicesApi.deleteNoteCategory(serviceType.id, catId); setNoteCats((l) => l.filter((c) => String(c.id) !== String(catId))); }
    catch (e) { setErr(e?.message || "Eroare la ștergere."); }
  }
  function addType() {
    const nm = newType.name.trim();
    if (!nm) return;
    setItemTypes((l) => [...l, { name: nm, color: newType.color || "" }]);
    setNewType({ name: "", color: "#2f81f7" });
  }

  const itemCats = noteCats.filter((c) => c.kind === "item");
  const planCats = noteCats.filter((c) => c.kind === "plan");

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Renunță</button>
      <button className="btn btn-primary" onClick={save} disabled={busy || loading}>{busy ? "Se salvează…" : "Salvează"}</button>
    </>
  );

  return (
    <Modal title={`Setări — ${serviceType.name}`} onClose={onClose} footer={footer} width={560}>
      {loading ? (
        <Skeleton lines={5} />
      ) : (
        <div className="sts">
          {err ? <div className="sts-err">{err}</div> : null}

          <section className="sts-sec">
            <div className="sts-h">General</div>
            <label className="fld"><span className="fl">Nume</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="fld"><span className="fl">Frecvență</span>
              <select className="sel" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                {FREQ.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </section>

          <section className="sts-sec">
            <div className="sts-h">Recurență</div>
            <label className="fld"><span className="fl">Ziua slujbei</span>
              <select className="sel" value={recDay} onChange={(e) => setRecDay(e.target.value)}>
                {WD.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            {frequency === "monthly" && (
              <label className="fld"><span className="fl">Săptămâna</span>
                <select className="sel" value={recWeek} onChange={(e) => setRecWeek(e.target.value)}>
                  {WOM.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            )}
            <div className="sts-note">Ziua recurentă = sugestie de dată când adaugi un plan sau o oră.</div>
          </section>

          <section className="sts-sec">
            <div className="sts-h">Repetiție</div>
            <Toggle on={reh.enabled} onChange={(v) => setReh((s) => ({ ...s, enabled: v }))} label="Are repetiție" hint="se creează automat la fiecare plan nou" />
            {reh.enabled && (
              <div className="reh-cfg">
                <label className="fld"><span className="fl">Cu câte zile înainte</span>
                  <input className="input sm reh-num" type="number" min="0" max="14" value={reh.dayOffset} onChange={(e) => setReh((s) => ({ ...s, dayOffset: e.target.value }))} />
                  <span className="reh-hint">0 = în ziua slujbei</span>
                </label>
                <div className="fld"><span className="fl">Ora</span>
                  <input className="input sm reh-time" placeholder="18:00" value={reh.start} onChange={(e) => setReh((s) => ({ ...s, start: e.target.value }))} inputMode="numeric" />
                  <span className="reh-dash">–</span>
                  <input className="input sm reh-time" placeholder="20:00" value={reh.end} onChange={(e) => setReh((s) => ({ ...s, end: e.target.value }))} inputMode="numeric" />
                </div>
                <div className="reh-who">
                  <div className="reh-wl">Cine vede repetiția</div>
                  <div className="reh-chips">
                    {teams.length === 0 && <span className="nc-none">Nicio echipă</span>}
                    {teams.map((t) => (
                      <button key={t.id} type="button" className={`reh-chip ${reh.visibleToTeamIds.includes(t.id) ? "on" : ""}`} onClick={() => toggleTeam(t.id)}>{t.name}</button>
                    ))}
                  </div>
                  <div className="sts-note">{reh.visibleToTeamIds.length ? "Doar echipele bifate (+ cine poate edita Order) văd ora repetiției." : "Fără restricție → toți cei programați văd ora repetiției."}</div>
                </div>
              </div>
            )}
          </section>

          <section className="sts-sec">
            <div className="sts-h">Publicare</div>
            <Toggle on={schedulePublish} onChange={setSchedulePublish} label="Publică automat planul" hint="în ziua serviciului" />
            <div className="pv-grid">
              {(pvKeys.length ? pvKeys : Object.keys(pv)).map((k) => (
                <Toggle key={k} on={!!pv[k]} onChange={(v) => setPv((s) => ({ ...s, [k]: v }))} label={PV_LABELS[k] || k} />
              ))}
            </div>
          </section>

          <section className="sts-sec">
            <div className="sts-h">Fișiere</div>
            <Toggle on={limitedFiles} onChange={setLimitedFiles} label="Vizibilitate limitată a fișierelor" hint="fiecare vede doar fișierele poziției lui" />
          </section>

          <section className="sts-sec">
            <div className="sts-h">Categorii de note</div>
            <div className="nc-two">
              {[["item", "Note elemente", itemCats], ["plan", "Note plan", planCats]].map(([kind, label, cats]) => (
                <div key={kind} className="nc-col">
                  <div className="nc-sub">{label}</div>
                  <div className="nc-chips">
                    {cats.length === 0 && <span className="nc-none">—</span>}
                    {cats.map((c) => (
                      <span key={c.id} className="nc-chip">{c.name}<button onClick={() => delCat(c.id)} aria-label="Șterge">×</button></span>
                    ))}
                  </div>
                  <div className="nc-add">
                    <input className="input sm" value={newCat[kind]} placeholder="Adaugă categorie"
                      onChange={(e) => setNewCat((s) => ({ ...s, [kind]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addCat(kind)} />
                    <button className="nc-plus" onClick={() => addCat(kind)} aria-label="Adaugă">+</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="sts-sec">
            <div className="sts-h">Tipuri de item</div>
            <div className="it-list">
              {itemTypes.length === 0 && <div className="nc-none">Niciun tip definit.</div>}
              {itemTypes.map((t, i) => (
                <div key={i} className="it-row">
                  <span className="it-sw" style={{ background: t.color || "var(--text-faint)" }} />
                  <span className="it-nm">{t.name}</span>
                  <button className="it-x" onClick={() => setItemTypes((l) => l.filter((_, j) => j !== i))} aria-label="Șterge">×</button>
                </div>
              ))}
            </div>
            <div className="it-add">
              <input className="input sm" value={newType.name} placeholder="Nume tip (ex. Predică)"
                onChange={(e) => setNewType((s) => ({ ...s, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addType()} />
              <input className="it-color" type="color" value={newType.color} onChange={(e) => setNewType((s) => ({ ...s, color: e.target.value }))} aria-label="Culoare" />
              <button className="nc-plus" onClick={addType} aria-label="Adaugă">+</button>
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .sts { display: flex; flex-direction: column; gap: 4px; animation: stsIn .18s ease; }
        @keyframes stsIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        .sts-muted { color: var(--text-faint); font-size: 13px; padding: 20px 0; }
        .sts-err { background: rgba(229,83,75,.12); border: 1px solid var(--danger); color: #f0a9a4; padding: 9px 12px; border-radius: 6px; font-size: 12.5px; margin-bottom: 6px; }
        .sts-sec { padding: 12px 0; border-top: 1px solid var(--border); }
        .sts-sec:first-of-type { border-top: none; padding-top: 2px; }
        .sts-h { color: var(--text-faint); font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 10px; }
        .fld { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .fl { color: var(--text-dim); font-size: 12.5px; width: 92px; flex: none; }
        .sel { flex: 1; height: 34px; background: var(--surface-2); color: var(--text); border: 1px solid var(--border-strong); border-radius: 6px; padding: 0 10px; font-size: 13px; outline: none; }
        .sel:focus { border-color: var(--primary); }
        .pv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; margin-top: 6px; }
        .nc-two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .nc-sub { color: var(--text-dim); font-size: 12px; margin-bottom: 7px; }
        .nc-chips { display: flex; flex-wrap: wrap; gap: 6px; min-height: 24px; margin-bottom: 8px; }
        .nc-none { color: var(--text-faint); font-size: 12px; }
        .nc-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text); font-size: 12px; padding: 3px 5px 3px 10px; border-radius: 14px; }
        .nc-chip button { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
        .nc-chip button:hover { color: var(--danger); }
        .nc-add, .it-add { display: flex; gap: 6px; align-items: center; }
        .input.sm { height: 32px; font-size: 12.5px; }
        .nc-plus { width: 32px; height: 32px; flex: none; background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 6px; cursor: pointer; font-size: 17px; line-height: 1; transition: border-color .12s, color .12s; }
        .nc-plus:hover { color: var(--primary); border-color: var(--primary); }
        .it-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 9px; }
        .it-row { display: flex; align-items: center; gap: 9px; padding: 5px 0; }
        .it-sw { width: 13px; height: 13px; border-radius: 4px; flex: none; }
        .it-nm { color: var(--text); font-size: 13px; flex: 1; }
        .it-x { background: transparent; border: none; color: var(--text-faint); cursor: pointer; font-size: 15px; line-height: 1; }
        .it-x:hover { color: var(--danger); }
        .it-color { width: 32px; height: 32px; flex: none; padding: 0; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--surface-2); cursor: pointer; }
        .sts-note { color: var(--text-faint); font-size: 11.5px; line-height: 1.45; margin-top: 4px; }
        .reh-cfg { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; animation: stsIn .16s ease; }
        .reh-num { width: 72px; flex: none; }
        .reh-time { width: 86px; flex: none; text-align: center; font-variant-numeric: tabular-nums; }
        .reh-dash { color: var(--text-faint); }
        .reh-hint { color: var(--text-faint); font-size: 11.5px; }
        .reh-who { margin-top: 8px; }
        .reh-wl { color: var(--text-dim); font-size: 12px; margin-bottom: 7px; }
        .reh-chips { display: flex; flex-wrap: wrap; gap: 7px; }
        .reh-chip { background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--text-dim); border-radius: 999px; padding: 5px 12px; font-size: 12.5px; cursor: pointer; transition: all .14s ease; }
        .reh-chip:hover { color: var(--text); border-color: var(--primary); }
        .reh-chip.on { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 600; }
      `}</style>
    </Modal>
  );
}
