"use client";
/**
 * AiProvider — context React peste întreaga aplicație. Expune registry-ul global
 * (surfaces) + helperi de rulare. Montat în layout-ul rădăcină => AI-ul e „global",
 * prezent în fiecare ecran, fără ca ecranele să-l importe explicit.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { subscribe, listSurfaces, snapshotContext, catalogActions, runAction } from "@/lib/ai/registry";
import { runAi } from "@/lib/ai/client";

const AiCtx = createContext(null);

export function AiProvider({ children }) {
  const [, force] = useState(0);

  // Re-randează când se schimbă suprafețele înregistrate.
  useEffect(() => subscribe(() => force((n) => n + 1)), []);

  const ask = useCallback(async (prompt) => {
    return runAi({ prompt, context: snapshotContext(), actions: catalogActions() });
  }, []);

  const value = useMemo(() => ({
    surfaces: listSurfaces(),
    snapshot: snapshotContext,
    actions: catalogActions,
    runAction,
    ask,
  }), [ask]);

  return <AiCtx.Provider value={value}>{children}</AiCtx.Provider>;
}

export function useAi() {
  const ctx = useContext(AiCtx);
  if (!ctx) throw new Error("useAi trebuie folosit în interiorul <AiProvider>.");
  return ctx;
}
