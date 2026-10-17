"use client";
/**
 * Modal — shell reutilizabil, stil PCO (fundal întunecat, titlu, corp, footer Cancel/Submit).
 * Folosit de Add Song, Add Arrangement, Add File, Edit Sequence, Song Information etc.
 */
import { useEffect } from "react";

export default function Modal({ title, onClose, children, footer, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ width }}>
        <div className="head">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="Închide">✕</button>
        </div>
        <div className="body">{children}</div>
        {footer && <div className="foot">{footer}</div>}
      </div>
      <style jsx>{`
        .ov { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.55);
          display: flex; align-items: flex-start; justify-content: center; padding: 64px 16px; }
        .modal { background: var(--modal-bg); border: 1px solid var(--border-strong);
          border-radius: 10px; max-width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,.5);
          display: flex; flex-direction: column; max-height: calc(100vh - 120px); }
        .head { display: flex; align-items: center; padding: 18px 20px 6px; }
        .head h3 { margin: 0; font-size: 18px; font-weight: 600; }
        .x { margin-left: auto; background: transparent; border: none; color: var(--text-dim);
          font-size: 14px; cursor: pointer; }
        .body { padding: 14px 20px 18px; overflow: auto; }
        .foot { display: flex; align-items: center; justify-content: flex-end; gap: 16px;
          padding: 14px 20px; border-top: 1px solid var(--border); }
      `}</style>
    </div>
  );
}
