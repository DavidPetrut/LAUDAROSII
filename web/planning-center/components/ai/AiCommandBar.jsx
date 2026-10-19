"use client";
/**
 * AiCommandBar — suprafața AI omniprezentă (colț dreapta-jos, pe fiecare ecran).
 * Trimite instrucțiunea + snapshot-ul a tot ce e pe ecran (registry) la gateway,
 * primește PROPUNERI de acțiuni și le execută DOAR după confirmarea omului (§10.1).
 *
 * Până gateway-ul server e activ, bara există și e funcțională ca „poartă" (arată clar
 * că e pregătită). Suportă și input vocal (Web Speech API) unde browserul permite —
 * baza pentru „comandă vocală" din cerință.
 */
import { useRef, useState } from "react";
import { useAi } from "@/lib/ai/AiProvider";
import { usePlayer } from "@/lib/player/PlayerProvider";

export default function AiCommandBar() {
  const { ask, runAction } = useAi();
  const { anyBottomBar } = usePlayer();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const recRef = useRef(null);

  async function submit() {
    if (!prompt.trim() || busy) return;
    setBusy(true); setResult(null);
    const r = await ask(prompt.trim());
    setResult(r);
    setBusy(false);
  }

  async function confirmAction(a) {
    try {
      await runAction(a.surfaceId, a.actionId, a.args);
      setResult((r) => ({ ...r, message: "✓ Acțiune aplicată.", proposedActions: [] }));
    } catch (e) {
      setResult((r) => ({ ...r, message: "Eroare: " + (e?.message || e) }));
    }
  }

  function toggleVoice() {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setResult({ ok: false, message: "Browserul nu suportă input vocal.", proposedActions: [] }); return; }
    if (recRef.current) { recRef.current.stop(); recRef.current = null; return; }
    const rec = new SR();
    rec.lang = "ro-RO"; rec.interimResults = true;
    rec.onresult = (e) => setPrompt(Array.from(e.results).map((x) => x[0].transcript).join(""));
    rec.onend = () => { recRef.current = null; };
    rec.start(); recRef.current = rec;
  }

  // Când e deschisă o bară jos (player sau click track), ascundem butonul AI — ar sta urât peste ele.
  if (anyBottomBar) return null;

  return (
    <>
      <button className="ai-fab" onClick={() => setOpen((v) => !v)} title="Asistent AI" aria-label="Asistent AI">
        <span className="ai-spark">✦</span>
      </button>

      {open && (
        <div className="ai-panel" role="dialog" aria-label="Asistent AI">
          <div className="ai-panel-head">
            <span className="ai-spark">✦</span> Asistent AI
            <button className="ai-x" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="ai-body">
            {result && (
              <div className={`ai-msg ${result.ok ? "" : "ai-msg-warn"}`}>
                <div>{result.message}</div>
                {(result.proposedActions || []).map((a, i) => (
                  <button key={i} className="btn btn-primary ai-act" onClick={() => confirmAction(a)}>
                    {a.label || `${a.surfaceId}.${a.actionId}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ai-input-row">
            <button className="ai-mic" onClick={toggleVoice} title="Vorbește">🎤</button>
            <input
              className="input"
              placeholder="Spune-i ce să facă pe ecranul ăsta…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "…" : "Trimite"}</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .ai-fab {
          position: fixed; right: 22px; bottom: 22px; z-index: 50;
          width: 48px; height: 48px; border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #6a5cff);
          color: #fff; border: none; cursor: pointer; font-size: 20px;
          box-shadow: 0 6px 20px rgba(0,0,0,.45);
        }
        .ai-spark { font-size: 15px; }
        .ai-panel {
          position: fixed; right: 22px; bottom: 82px; z-index: 50;
          width: 360px; max-width: calc(100vw - 32px);
          background: var(--modal-bg); border: 1px solid var(--border-strong);
          border-radius: 10px; box-shadow: 0 16px 48px rgba(0,0,0,.5);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .ai-panel-head {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px; font-weight: 600; border-bottom: 1px solid var(--border);
        }
        .ai-x { margin-left: auto; background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 13px; }
        .ai-body { padding: 12px 14px; min-height: 48px; max-height: 320px; overflow: auto; color: var(--text-dim); font-size: 13px; }
        .ai-msg { color: var(--text); }
        .ai-msg-warn { color: #e8c468; }
        .ai-act { margin-top: 8px; margin-right: 6px; }
        .ai-input-row { display: flex; gap: 8px; align-items: center; padding: 12px 14px; border-top: 1px solid var(--border); }
        .ai-mic { background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 6px; width: 34px; height: 34px; cursor: pointer; }
      `}</style>
    </>
  );
}
