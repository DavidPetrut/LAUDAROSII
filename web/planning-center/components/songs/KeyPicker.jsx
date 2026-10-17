"use client";
/**
 * KeyPicker — selectorul de gamă ca în PCO (toggle Major/Minor + grilă de note pe 3 coloane:
 * bemoli stânga / naturale mijloc / diezi dreapta). Întoarce cheia ca string: "C" (major) sau "Cm" (minor).
 */
import { useState } from "react";

// Layout-ul din PCO (rânduri), fiecare: [bemol, natural, diez] ("" = gol).
const ROWS = [
  ["Ab", "A", "A#"],
  ["Bb", "B", ""],
  ["", "C", "C#"],
  ["Db", "D", "D#"],
  ["Eb", "E", ""],
  ["", "F", "F#"],
  ["Gb", "G", "G#"],
];

export default function KeyPicker({ value, onPick }) {
  const [mode, setMode] = useState(value?.endsWith("m") ? "minor" : "major");
  const base = value ? value.replace(/m$/, "") : "";

  function pick(note) {
    if (!note) return;
    onPick(mode === "minor" ? `${note}m` : note);
  }

  return (
    <div className="kp">
      <div className="toggle">
        <button className={mode === "major" ? "on" : ""} onClick={() => setMode("major")} type="button">Major</button>
        <button className={mode === "minor" ? "on" : ""} onClick={() => setMode("minor")} type="button">Minor</button>
      </div>
      <div className="grid">
        {ROWS.map((row, i) => (
          <div className="row" key={i}>
            {row.map((n, j) => (
              <button key={j} type="button" disabled={!n}
                className={`cell ${n && base === n ? "sel" : ""} ${!n ? "empty" : ""}`}
                onClick={() => pick(n)}>
                {n}
              </button>
            ))}
          </div>
        ))}
      </div>
      <style jsx>{`
        .kp { background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; padding: 10px; width: 260px; }
        .toggle { display: flex; gap: 0; margin-bottom: 10px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-strong); }
        .toggle button { flex: 1; background: var(--surface-2); color: var(--text-dim); border: none; height: 30px; cursor: pointer; font-size: 13px; }
        .toggle button.on { background: var(--primary); color: #fff; }
        .grid { display: flex; flex-direction: column; gap: 4px; }
        .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        .cell { height: 30px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 5px; color: var(--text); cursor: pointer; font-size: 13px; }
        .cell:hover:not(.empty) { background: var(--surface); border-color: var(--primary); }
        .cell.sel { background: var(--primary); border-color: var(--primary); color: #fff; }
        .cell.empty { visibility: hidden; }
      `}</style>
    </div>
  );
}
