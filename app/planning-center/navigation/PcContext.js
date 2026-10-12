/**
 * Context Planning Center — încarcă o dată viewerul curent (/me): profil + permisiuni +
 * capabilități + echipele lui. Partajat în tot modulul. Reîncarcabil (reloadMe).
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { pcApi } from "../api/pcApi";

const PcContext = createContext({ me: null, loading: true, error: null, reloadMe: () => {} });

export function PcProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seededRef = useRef(false);

  const reloadMe = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pcApi.me();
      setMe(data);
      setError(null);

      // Prima intrare ca admin: dacă nu există oameni, rulează migrarea users→pc_people (o dată/sesiune).
      if (data?.permission?.isOrgAdmin && !seededRef.current) {
        seededRef.current = true;
        try {
          const st = await pcApi.admin.status();
          if ((st?.people || 0) === 0) {
            await pcApi.admin.seed();
          }
        } catch (_) {
          /* non-fatal */
        }
      }
    } catch (e) {
      setError(e?.message || "Eroare");
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadMe();
  }, [reloadMe]);

  return (
    <PcContext.Provider value={{ me, loading, error, reloadMe }}>{children}</PcContext.Provider>
  );
}

export const usePc = () => useContext(PcContext);

/** Shell context — expune ieșirea din modul (înapoi în app-ul principal). */
export const PcShellContext = createContext({ exitModule: () => {} });
export const usePcShell = () => useContext(PcShellContext);

export default PcContext;
