"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

/**
 * Appearance controls.
 *
 * Three axes that genuinely change the feel of the room rather than tinting it:
 * how much the interface moves, how tightly the transcript reads, and which
 * metal the brassware is cut from. Choices persist per device.
 *
 * Two placements share one implementation — a floating trigger on wide screens,
 * and an inline section in the drawer on phones, where a floating panel would
 * sit on top of the conversation.
 */

type Motion = "cinematic" | "balanced" | "calm";
type Density = "comfortable" | "compact";
type Accent = "gold" | "champagne" | "platinum" | "amber";

interface Preferences {
  motion: Motion;
  density: Density;
  accent: Accent;
}

const STORAGE_KEY = "khaki:appearance";
const CHANGE_EVENT = "khaki:appearance-change";

const DEFAULTS: Preferences = { motion: "balanced", density: "comfortable", accent: "gold" };

const GROUPS: Array<{
  key: keyof Preferences;
  label: string;
  hint: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    key: "motion",
    label: "Mwendo",
    hint: "Kiwango cha mwendo kwenye skrini",
    options: [
      { value: "cinematic", label: "Sinema" },
      { value: "balanced", label: "Kawaida" },
      { value: "calm", label: "Tulivu" },
    ],
  },
  {
    key: "density",
    label: "Mpangilio",
    hint: "Uwazi wa maandishi",
    options: [
      { value: "comfortable", label: "Wazi" },
      { value: "compact", label: "Konda" },
    ],
  },
  {
    key: "accent",
    label: "Rangi ya chuma",
    hint: "Rangi ya dhahabu inayotumika",
    options: [
      { value: "gold", label: "Dhahabu" },
      { value: "champagne", label: "Shampeni" },
      { value: "platinum", label: "Platinamu" },
      { value: "amber", label: "Kahawia" },
    ],
  },
];

function read(): Preferences {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...(JSON.parse(stored) as Partial<Preferences>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function apply(preferences: Preferences) {
  const root = document.documentElement;
  root.dataset.motion = preferences.motion;
  root.dataset.density = preferences.density;
  root.dataset.accent = preferences.accent;
}

function write(preferences: Preferences) {
  apply(preferences);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    /* storage blocked — the choice still applies for this session */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Shared appearance state. Every instance stays in sync within the page. */
export function useAppearance() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read after mount so server and client markup stay identical.
    const initial = read();
    setPreferences(initial);
    apply(initial);
    setReady(true);

    const sync = () => setPreferences(read());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((key: keyof Preferences, value: string) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value } as Preferences;
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPreferences(DEFAULTS);
    write(DEFAULTS);
  }, []);

  return { preferences, update, reset, ready };
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function AppearancePanel({ className }: { className?: string }) {
  const { preferences, update, reset } = useAppearance();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {GROUPS.map((group) => (
        <div key={group.key}>
          <p className="text-[12px] font-medium text-ink-2">{group.label}</p>
          <p className="mb-1.5 text-[11px] text-ink-4">{group.hint}</p>
          <div className="flex flex-wrap gap-1">
            {group.options.map((option) => {
              const active = preferences[group.key] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update(group.key, option.value)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[12px] font-medium",
                    "transition duration-2 ease-fluid active:scale-95",
                    active
                      ? "bg-gold-500/16 text-gold-200 ring-1 ring-gold-500/35"
                      : "text-ink-3 ring-1 ring-white/[0.07] hover:bg-white/[0.05] hover:text-ink-2",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={reset}
        className="mt-0.5 self-start text-[12px] text-ink-4 underline decoration-white/15 underline-offset-2 transition-colors hover:text-ink-2"
      >
        Rudisha mwonekano wa kawaida
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Floating trigger (wide screens only)                                */
/* ------------------------------------------------------------------ */

export function StudioControls() {
  const [open, setOpen] = useState(false);
  const { ready } = useAppearance();

  return (
    <div className="fixed bottom-6 right-5 z-40 hidden flex-col items-end gap-2 lg:flex">
      {open && (
        <div
          role="group"
          aria-label="Mipangilio ya mwonekano"
          className="material-regular anim-rise w-[17rem] rounded-2xl p-3.5"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="plate-type text-gold-300">Mwonekano</p>
            <IconButton
              label="Funga mipangilio ya mwonekano"
              size="sm"
              onClick={() => setOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>
          <AppearancePanel />
        </div>
      )}

      <IconButton
        label={open ? "Funga mipangilio ya mwonekano" : "Mipangilio ya mwonekano"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "material-thin rounded-full",
          open && "border-gold-500/35 text-gold-300",
          !ready && "opacity-0",
        )}
      >
        <SlidersHorizontal className="h-[18px] w-[18px]" />
      </IconButton>
    </div>
  );
}
