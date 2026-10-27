"use client";
/**
 * TopNav — bara de sus, IDENTICĂ cu PCO Services:
 * [logo verde „services" ▾]   My Schedule · Plans · Songs · Media · People        🔍  Vertical București ▾  (avatar)
 * Linkul activ e evidențiat. Culorile vin din tokens (globals.css).
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser, clearSession } from "@/lib/auth/auth";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/my-schedule", label: "My Schedule" },
  { href: "/plans", label: "Plans" },
  { href: "/songs", label: "Songs" },
  { href: "/media", label: "Media" },
  { href: "/people", label: "People" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(getStoredUser()); }, []);

  function logout() { clearSession(); router.replace("/login"); }

  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-logo" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16"><g fill="#fff"><circle cx="2.5" cy="3" r="1.3"/><rect x="5.5" y="2.2" width="8.5" height="1.7" rx=".8"/><circle cx="2.5" cy="8" r="1.3"/><rect x="5.5" y="7.2" width="8.5" height="1.7" rx=".8"/><circle cx="2.5" cy="13" r="1.3"/><rect x="5.5" y="12.2" width="8.5" height="1.7" rx=".8"/></g></svg>
          </span>
          <span className="brand-name">services</span>
          <span className="brand-caret">▾</span>
        </div>

        <nav className="links">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href} className={`link ${active ? "active" : ""}`}>{n.label}</Link>
            );
          })}
        </nav>

        <div className="right">
          <button className="icon-btn" title="Caută" aria-label="Caută">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4.5"/><path d="M11 11l3 3"/></svg>
          </button>
          <button className="org">Vertical București <span className="brand-caret">▾</span></button>
          <button className="avatar" onClick={logout} title={user?.email ? `${user.email} — click pt. logout` : "Logout"}>
            {(user?.personalData?.firstName || user?.email || "?").slice(0, 1).toUpperCase()}
          </button>
        </div>
      </div>

      <style jsx>{`
        .nav { height: var(--nav-h); background: var(--bg-header);
          background-image: linear-gradient(90deg, rgba(87,185,138,.10), rgba(87,185,138,0) 42%);
          border-bottom: 1px solid var(--border-soft); position: sticky; top: 0; z-index: 30; }
        .nav-inner { height: 100%; width: 100%; margin: 0; padding: 0 20px;
          display: flex; align-items: center; gap: 34px; }
        .brand { display: flex; align-items: center; gap: 7px; }
        .brand-logo { width: 26px; height: 26px; border-radius: 7px; background: var(--product);
          display: inline-flex; align-items: center; justify-content: center; }
        .brand-name { font-size: 16px; font-weight: 600; letter-spacing: .2px; }
        .brand-caret { color: var(--text-faint); font-size: 10px; }
        .links { display: flex; align-items: center; gap: 6px; }
        .link { padding: 8px 18px; border-radius: 8px; color: var(--text-dim); font-size: 13.5px; border: 1px solid transparent; transition: background .12s, color .12s, border-color .12s; }
        .link:hover { color: var(--text); background: rgba(255,255,255,.06); }
        .link.active { color: var(--text); background: var(--surface-3); border-color: var(--border-strong); font-weight: 600; box-shadow: inset 0 0 0 1px rgba(255,255,255,.02); }
        .right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
        .icon-btn { background: transparent; border: none; color: var(--text-dim); cursor: pointer; padding: 6px; border-radius: 6px; }
        .icon-btn:hover { color: var(--text); background: rgba(255,255,255,.05); }
        .org { background: transparent; border: none; color: var(--text); font-size: 13px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
        .avatar { width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer;
          background: #3a4552; color: #fff; font-size: 12px; font-weight: 600; }
      `}</style>
    </header>
  );
}
