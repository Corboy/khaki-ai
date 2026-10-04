"use client";

import { CalendarCheck, Check, Loader2, MessageCircle, Sparkles } from "lucide-react";

import { buildWhatsAppBookingUrl } from "@/config/khaki";
import { useStudioInfo } from "@/components/studio-info";
import { cn } from "@/lib/utils";

/**
 * Booking fields as the model supplies them (Kiswahili keys, all optional
 * because arguments stream in progressively).
 */
export type BookingArgs = {
  jina?: string;
  huduma?: string;
  tarehe?: string;
  muda?: string;
  maelezo?: string;
  name?: string;
  service?: string;
  date?: string;
  time?: string;
  notes?: string;
};

/** Shapes returned by the backend tools in `src/app/api/chat/route.ts`. */
interface BookingResult {
  type: "booking-draft";
  draft: BookingArgs;
  missing: string[];
  ready: boolean;
  studio: string;
  depositPercentage: number;
}

interface PricingPackage {
  name: string;
  price: string;
  features: string[];
}

interface PricingResult {
  type: "pricing";
  found: boolean;
  serviceId: string;
  title?: string;
  swahiliTitle?: string;
  startingAt?: string;
  rateType?: string;
  packages?: PricingPackage[];
}

export interface ToolCardProps<TResult> {
  args: Record<string, unknown>;
  result?: TResult;
  status: { type: string };
}

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

function CardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "material-gold anim-rise my-2 overflow-hidden rounded-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardPending({ label }: { label: string }) {
  return (
    <div className="my-2 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold-500" />
      <span className="text-[13.5px] text-ink-2">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Booking draft                                                       */
/* ------------------------------------------------------------------ */

export function BookingDraftCard({ args, result, status }: ToolCardProps<BookingResult>) {
  const { whatsappNumber, studioName } = useStudioInfo();

  if (status.type === "running" || !result) {
    return <CardPending label="Inaandaa kadi ya booking" />;
  }

  const draft: BookingArgs = result.draft ?? (args as BookingArgs);
  const rows: Array<[string, string | undefined]> = [
    ["Huduma", draft.huduma ?? draft.service],
    ["Tarehe", draft.tarehe ?? draft.date],
    ["Muda", draft.muda ?? draft.time],
    ["Maelezo", draft.maelezo ?? draft.notes],
  ];
  const filled = rows.filter(([, value]) => Boolean(value));
  const whatsappUrl = buildWhatsAppBookingUrl(
    {
      name: draft.jina ?? draft.name,
      service: draft.huduma ?? draft.service,
      date: draft.tarehe ?? draft.date,
      time: draft.muda ?? draft.time,
      notes: draft.maelezo ?? draft.notes,
    },
    whatsappNumber,
  );

  return (
    <CardShell>
      {/* Ticket head */}
      <div className="flex items-center gap-2.5 border-b border-gold-500/20 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-500/12 ring-1 ring-gold-500/30">
          <CalendarCheck className="h-4 w-4 text-gold-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="plate-type text-gold-300">Ombi la booking</p>
          <p className="truncate text-[13px] text-ink-2">{studioName}</p>
        </div>
        {result.ready && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/12 px-2 py-0.5 text-[11px] font-medium text-gold-300 ring-1 ring-gold-500/25">
            <Check className="h-3 w-3" /> Tayari
          </span>
        )}
      </div>

      {/* Detail rows */}
      <dl className="divide-y divide-white/[0.055]">
        {filled.map(([label, value]) => (
          <div key={label} className="flex gap-3 px-4 py-2.5">
            <dt className="w-[74px] shrink-0 text-[13px] text-ink-3">{label}</dt>
            <dd className="tnum min-w-0 flex-1 text-[13.5px] text-ink">{value}</dd>
          </div>
        ))}
        {!filled.length && (
          <div className="px-4 py-3 text-[13.5px] text-ink-3">
            Bado tunahitaji huduma na tarehe.
          </div>
        )}
      </dl>

      {/* Action */}
      <div className="flex flex-col gap-2 border-t border-gold-500/18 bg-black/25 px-4 py-3">
        {!result.ready && result.missing?.length > 0 && (
          <p className="text-[12.5px] text-ink-3">
            Tunahitaji {result.missing.join(" na ")} ili kuthibitisha nafasi.
          </p>
        )}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold",
            "brass-fill metal-sweep text-black shadow-gold",
            "transition active:scale-[0.97] hover:brightness-110",
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Tuma ombi kwa WhatsApp
        </a>
        {
          /* Only mention a deposit when the business has actually published one. */
          result.depositPercentage > 0 && (
            <p className="text-center text-[11.5px] text-ink-3">
              Amana ya {result.depositPercentage}% inahifadhi nafasi yako
            </p>
          )
        }
      </div>
    </CardShell>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

export function PricingCard({ result, status }: ToolCardProps<PricingResult>) {
  if (status.type === "running" || !result) {
    return <CardPending label="Inaandaa bei" />;
  }
  if (!result.found || !result.packages?.length) {
    return (
      <div className="my-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13.5px] text-ink-2">
        Bei za huduma hiyo zinathibitishwa na timu yetu.
      </div>
    );
  }

  return (
    <CardShell className="!border-white/[0.09] bg-gradient-to-b from-white/[0.045] to-white/[0.015]">
      <div className="flex items-start gap-2.5 border-b border-white/[0.07] px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-500/12 ring-1 ring-gold-500/25">
          <Sparkles className="h-4 w-4 text-gold-400" />
        </span>
        <div className="min-w-0">
          <h4 className="truncate text-[15px] font-semibold tracking-[-0.015em] text-white">
            {result.swahiliTitle}
          </h4>
          <p className="text-[12.5px] text-ink-3">
            Inaanzia <span className="tnum text-gold-300">{result.startingAt}</span>
            {result.rateType ? ` · ${result.rateType}` : ""}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-white/[0.055]">
        {result.packages.map((pkg) => (
          <li key={pkg.name} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-[14px] font-medium text-ink">{pkg.name}</span>
              <span className="tnum text-[13.5px] font-semibold text-gold-300">
                {pkg.price}
              </span>
            </div>
            <ul className="mt-1.5 space-y-1">
              {pkg.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-[12.5px] leading-snug text-ink-2">
                  <Check className="mt-[3px] h-3 w-3 shrink-0 text-gold-500/80" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

/* ------------------------------------------------------------------ */
/* Fallback for unknown tools                                          */
/* ------------------------------------------------------------------ */

export function ToolFallback({ status }: { status: { type: string } }) {
  if (status.type !== "running") return null;
  return <CardPending label="Inafanya kazi" />;
}
