"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { KHAKI_CONFIG } from "@/config/khaki";

/**
 * Studio details that are editable at runtime from /admin.
 *
 * Values start from the build-time config so the first paint is always correct,
 * then refresh from `/api/studio` once the page is live. Consumers never have
 * to handle a loading state — the fallback is already the right answer.
 */

export interface StudioInfo {
  whatsappNumber: string;
  displayPhone: string;
  studioName: string;
}

const FALLBACK: StudioInfo = {
  whatsappNumber: KHAKI_CONFIG.contact.whatsappNumber.replace(/[^0-9]/g, ""),
  displayPhone: KHAKI_CONFIG.contact.displayPhone,
  studioName: KHAKI_CONFIG.brandName,
};

const StudioInfoContext = createContext<StudioInfo>(FALLBACK);

export function StudioInfoProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<StudioInfo>(FALLBACK);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/studio", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Partial<StudioInfo> | null) => {
        if (!data?.whatsappNumber) return;
        setInfo({
          whatsappNumber: data.whatsappNumber,
          displayPhone: data.displayPhone || FALLBACK.displayPhone,
          studioName: data.studioName || FALLBACK.studioName,
        });
      })
      .catch(() => {
        /* offline or aborted — the build-time values stay in place */
      });

    return () => controller.abort();
  }, []);

  return <StudioInfoContext.Provider value={info}>{children}</StudioInfoContext.Provider>;
}

export function useStudioInfo(): StudioInfo {
  return useContext(StudioInfoContext);
}
