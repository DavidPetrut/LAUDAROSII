"use client";
/**
 * useAiSurface — un ecran/componentă se „deschide" către AI cu O SINGURĂ linie.
 *
 *   useAiSurface({
 *     id: "songs.list",
 *     label: "Lista de cântece",
 *     scope: "page",
 *     getContext: () => ({ query, count: songs.length, selectedReporter }),
 *     actions: [
 *       { id: "search", label: "Caută", description: "Filtrează lista", params: { q: "string" },
 *         run: ({ q }) => setQuery(q) },
 *     ],
 *   }, [query, songs]);
 *
 * Atât. Ecranul devine „vizibil & acționabil" pentru AI, fără alt plumbing.
 * `deps` controlează când se re-înregistrează (ca getContext/actions să prindă state-ul curent).
 */
import { useEffect } from "react";
import { registerSurface } from "@/lib/ai/registry";

export function useAiSurface(surface, deps = []) {
  useEffect(() => {
    const unregister = registerSurface(surface);
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
