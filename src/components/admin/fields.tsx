"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

/**
 * Settings controls.
 *
 * Every control here owns its label association, focus ring, and 44px minimum
 * height, so the panel is keyboard-navigable and touch-safe by construction
 * rather than by remembering to add attributes at each call site.
 */

/* ------------------------------------------------------------------ */
/* Layout primitives                                                   */
/* ------------------------------------------------------------------ */

export function SettingsGroup({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="anim-rise">
      <h2 className="px-1 pb-2 text-[13px] font-semibold uppercase tracking-[0.09em] text-ink-3">
        {title}
      </h2>
      <div className="surface-card overflow-hidden rounded-2xl">
        <div className="divide-y divide-white/[0.055]">{children}</div>
      </div>
      {description && <p className="px-1 pt-2 text-[12.5px] leading-snug text-ink-3">{description}</p>}
      {footer && <div className="px-1 pt-3">{footer}</div>}
    </section>
  );
}

export function SettingsRow({
  label,
  hint,
  htmlFor,
  children,
  align = "stacked",
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  /** `inline` puts the control on the same line on wide screens */
  align?: "stacked" | "inline";
}) {
  return (
    <div
      className={cn(
        "gap-3 px-4 py-3.5",
        align === "inline" ? "flex flex-col sm:flex-row sm:items-center" : "flex flex-col",
      )}
    >
      <div className={cn(align === "inline" && "sm:w-52 sm:shrink-0")}>
        <label
          htmlFor={htmlFor}
          className="block text-[14px] font-medium leading-tight text-ink"
        >
          {label}
        </label>
        {hint && <p className="mt-1 text-[12.5px] leading-snug text-ink-3">{hint}</p>}
      </div>
      <div className={cn(align === "inline" && "sm:flex-1")}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

const INPUT_CLASS = cn(
  "h-11 w-full rounded-xl bg-white/[0.045] px-3.5",
  "text-[15px] text-ink placeholder:text-ink-4",
  "border border-white/[0.08] outline-none",
  "transition duration-2 ease-fluid",
  "hover:border-white/[0.14]",
  "focus:border-gold-500/45 focus:bg-white/[0.06]",
  "focus:shadow-[0_0_0_3px_rgba(var(--gold-rgb)/0.14)]",
  "disabled:opacity-45",
);

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
  inputMode,
  autoComplete = "off",
  suffix,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: "text" | "tel" | "numeric";
  autoComplete?: string;
  suffix?: ReactNode;
}) {
  const id = useId();
  return (
    <SettingsRow label={label} hint={hint} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={cn(INPUT_CLASS, suffix && "pr-12")}
        />
        {suffix && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{suffix}</span>
        )}
      </div>
    </SettingsRow>
  );
}

export function SecretField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  configured,
  onClear,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** True when a key is stored on the server (value may be the mask) */
  configured: boolean;
  onClear: () => void;
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  return (
    <SettingsRow
      label={label}
      hint={hint}
      htmlFor={id}
      align="stacked"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            type={revealed ? "text" : "password"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            className={cn(INPUT_CLASS, "pr-12 font-mono text-[13.5px]")}
          />
          <IconButton
            label={revealed ? "Ficha key" : "Onyesha key"}
            size="sm"
            onClick={() => setRevealed((current) => !current)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </IconButton>
        </div>
        {configured && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              "h-11 shrink-0 rounded-xl px-3.5 text-[13.5px] font-medium",
              "border border-white/[0.08] text-ink-3",
              "transition duration-2 ease-fluid hover:border-red-400/35 hover:text-red-300",
            )}
          >
            Ondoa
          </button>
        )}
      </div>
    </SettingsRow>
  );
}

export function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
  loading,
  action,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  loading?: boolean;
  action?: ReactNode;
}) {
  const id = useId();
  return (
    <SettingsRow label={label} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={cn(INPUT_CLASS, "appearance-none pr-10 font-mono text-[13.5px]")}
          >
            {!options.some((option) => option.value === value) && (
              <option value={value}>{value}</option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-obsidian-3">
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "▾"}
          </span>
        </div>
        {action}
      </div>
    </SettingsRow>
  );
}

export function SliderField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  hint?: ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
}) {
  const id = useId();
  return (
    <SettingsRow label={label} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-3.5">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={cn(
            "brass-range h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.12]",
            "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.6)]",
            "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-0",
          )}
        />
        <span className="tnum w-14 shrink-0 text-right text-[13.5px] font-medium text-gold-300">
          {format ? format(value) : value}
        </span>
      </div>
    </SettingsRow>
  );
}

export function TextAreaField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 5,
  maxLength,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <SettingsRow label={label} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          INPUT_CLASS,
          "h-auto resize-y py-3 font-sans text-[14.5px] leading-relaxed",
        )}
      />
      {maxLength && (
        <p className="mt-1.5 text-right text-[11.5px] tnum text-ink-4">
          {value.length} / {maxLength}
        </p>
      )}
    </SettingsRow>
  );
}

/**
 * A mutually exclusive choice, as an actual radio group.
 *
 * The roles were right and the behaviour was not: `role="radiogroup"` with
 * `role="radio"` children built from plain buttons gives a screen reader
 * "radio button, 1 of 3" and then ignores the arrow keys it invites. Measured
 * on /admin: ArrowDown and ArrowRight both left the selection where it was.
 *
 * Buttons tab and radios arrow, so an element carrying radio roles has to
 * answer to arrows. This implements the pattern: roving tabindex so the group
 * is one Tab stop, arrows that move focus and selection together, and Home/End
 * for the ends. Space and Enter already work because they are buttons.
 */
export function SegmentedField<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: ReactNode;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; description?: string }>;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = options.length - 1;
    const current = options.findIndex((option) => option.value === value);

    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = current >= last ? 0 : current + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = current <= 0 ? last : current - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }

    const target = options[next];
    if (!target) return;
    event.preventDefault();
    onChange(target.value);

    // Focus follows selection, which is what makes a radio group one Tab stop.
    // The element is found after the re-render that onChange schedules.
    const group = event.currentTarget;
    window.requestAnimationFrame(() => {
      group.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
    });
  };

  return (
    <SettingsRow label={label} hint={hint}>
      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl px-3.5 py-3 text-left transition duration-2 ease-fluid active:scale-[0.985]",
                active
                  ? "border border-gold-500/40 bg-gold-500/[0.09] shadow-gold"
                  : "border border-white/[0.08] bg-white/[0.025] hover:border-white/[0.16] hover:bg-white/[0.045]",
              )}
            >
              <span
                className={cn(
                  "block text-[14px] font-medium",
                  active ? "text-gold-200" : "text-ink",
                )}
              >
                {option.label}
              </span>
              {option.description && (
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </SettingsRow>
  );
}
