"use client";
/**
 * Shell-ul aplicației autentificate: TopNav + conținut + bara AI omniprezentă.
 * Guard: fără token => /login. (Auth-ul e doar în client; API-ul validează oricum tokenul.)
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthed } from "@/lib/auth/auth";
import TopNav from "@/components/shell/TopNav";
import AiCommandBar from "@/components/ai/AiCommandBar";

export default function AppLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthed()) { router.replace("/login"); return; }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <>
      <TopNav />
      <main style={{ maxWidth: "var(--content-max)", margin: "0 auto", padding: "0 var(--gutter)" }}>
        {children}
      </main>
      <AiCommandBar />
    </>
  );
}
