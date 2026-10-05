import Link from "next/link";

import { AmbientBackdrop } from "@/components/brand/ambient-backdrop";
import { BrandedFallback } from "@/components/brand/branded-fallback";

/** A wrong URL, in the studio's own voice rather than Next.js's default. */
export default function NotFound() {
  return (
    <>
      <AmbientBackdrop intensity="quiet" />
      <BrandedFallback
        eyebrow="Ukurasa haupo"
        headline="Huku hakuna kitu."
        body="Ukurasa uliouomba haupo. Rudi kwenye chat na tuendelee."
        className="relative z-10"
      >
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full brass-fill metal-sweep px-5 text-[14.5px] font-semibold text-black shadow-gold transition active:scale-[0.97] hover:brightness-110"
        >
          Rudi kwenye chat
        </Link>
      </BrandedFallback>
    </>
  );
}
