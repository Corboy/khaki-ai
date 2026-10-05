"use client";

import { useEffect } from "react";

import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
import { BrandedFallback } from "@/components/brand/branded-fallback";

/**
 * Route-level error boundary.
 *
 * Without this, a render error anywhere in the tree dropped the visitor onto
 * Next.js's default screen — unstyled, in English, reading "Application error:
 * a client-side exception has occurred". Wrong language, wrong voice, and no way
 * to reach the business from a page that is already broken.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[khaki] render error:", error);
  }, [error]);

  return (
    <>
      <AmbientBackdrop intensity="quiet" />
      <BrandedFallback
        eyebrow="Khaki Media"
        headline="Kuna hitilafu ndogo."
        body="Samahani — kitu hakikupakia vizuri. Jaribu tena; kama kunaendelea, wasiliana nasi moja kwa moja."
        onRetry={reset}
        className="relative z-10"
      />
    </>
  );
}
