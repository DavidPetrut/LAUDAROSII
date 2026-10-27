"use client";
/**
 * Login — aceleași credențiale ca în app-ul mobil (POST /api/auth/login).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/songs");
    } catch (e) { setErr(e?.message || "Autentificare eșuată."); }
    finally { setBusy(false); }
  }

  return (
    <div className="wrap">
      <form className="card" onSubmit={submit}>
        <div className="logo"><img className="sq" src="/logo_vertical.jpg" alt="Vertical" /> services</div>
        <h1>Autentificare</h1>
        <p className="sub">Folosește aceleași date ca în aplicația Vertical.</p>
        {err && <div className="err">{err}</div>}
        <label>Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        <label>Parolă</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn btn-primary full" disabled={busy} type="submit">{busy ? "Se conectează…" : "Intră"}</button>
      </form>

      <style jsx>{`
        .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { width: 360px; max-width: 100%; background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 28px; }
        .logo { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 600; margin-bottom: 18px; }
        .sq { width: 22px; height: 22px; border-radius: 6px; object-fit: cover; display: inline-block; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .sub { color: var(--text-dim); font-size: 13px; margin: 0 0 18px; }
        label { display: block; font-size: 12px; color: var(--text-dim); margin: 12px 0 6px; }
        .full { width: 100%; justify-content: center; margin-top: 20px; height: 38px; }
        .err { background: rgba(229,83,75,.12); border: 1px solid rgba(229,83,75,.4); color: #f0a7a2;
          padding: 9px 12px; border-radius: 6px; font-size: 13px; }
      `}</style>
    </div>
  );
}
