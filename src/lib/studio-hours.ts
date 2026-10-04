import { KHAKI_CONFIG } from "@/config/khaki";

/**
 * Opening hours — the derivation layer.
 *
 * `KHAKI_CONFIG.workingHours.schedule` holds the times. Everything else is
 * computed from it: the opening-hours copy shown in the sidebar and the system
 * prompt, and the live indicator that says whether the studio is open right
 * now. Before this existed the same times were written out by hand in three
 * files and could drift apart the moment anyone edited one of them.
 */

export interface DaySchedule {
  day: number;
  label: string;
  /** Minutes from midnight, or null when closed */
  open: number | null;
  close: number | null;
}

/** "HH:MM" → minutes from midnight. Returns null for anything unparseable. */
function toMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Minutes from midnight → "08:30". */
export function formatClock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Minutes from midnight → how a Tanzanian would say it: "8:30 asubuhi",
 * "9:00 usiku". The 24-hour form is kept alongside it in the UI so nobody has
 * to do the arithmetic.
 */
export function describeClock(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const clock = `${hours12}:${String(mins).padStart(2, "0")}`;

  if (hours24 < 6) return `${clock} alfajiri`;
  if (hours24 < 12) return `${clock} asubuhi`;
  if (hours24 < 16) return `${clock} mchana`;
  if (hours24 < 19) return `${clock} jioni`;
  return `${clock} usiku`;
}

export const STUDIO_SCHEDULE: DaySchedule[] = KHAKI_CONFIG.workingHours.schedule.map((entry) => ({
  day: entry.day,
  label: entry.label,
  open: toMinutes(entry.open),
  close: toMinutes(entry.close),
}));

/** True when no day has published hours — the business works by appointment. */
export function isAppointmentOnly(): boolean {
  return STUDIO_SCHEDULE.every((entry) => entry.open == null || entry.close == null);
}

function find(day: number): DaySchedule | undefined {
  return STUDIO_SCHEDULE.find((entry) => entry.day === day);
}

function describeRange(entry: DaySchedule): string {
  if (entry.open == null || entry.close == null) return KHAKI_CONFIG.workingHours.appointmentNote;
  return `${describeClock(entry.open)} – ${describeClock(entry.close)}`;
}

export interface OpeningHoursCopy {
  weekdays: string;
  saturdays: string;
  sundays: string;
  overnight: string;
  /** One line per row, for the sidebar, the prompt and the FAQ */
  lines: string[];
}

/** The opening-hours text, generated once and reused everywhere. */
export function describeOpeningHours(): OpeningHoursCopy {
  const overnight = KHAKI_CONFIG.workingHours.overnight;
  const note = KHAKI_CONFIG.workingHours.appointmentNote;

  // A business that works by appointment should not be shown seven identical
  // "kwa miadi" rows.
  if (isAppointmentOnly()) {
    const lines = overnight ? [note, overnight] : [note];
    return { weekdays: note, saturdays: note, sundays: note, overnight, lines };
  }

  // Monday–Friday share one row when their hours are identical.
  const weekdayEntries = [1, 2, 3, 4, 5].map(find).filter((entry): entry is DaySchedule => !!entry);
  const sameWeekdays = weekdayEntries.every(
    (entry) =>
      entry.open === weekdayEntries[0]?.open && entry.close === weekdayEntries[0]?.close,
  );

  const weekdays = sameWeekdays
    ? `${weekdayEntries[0]!.label} – ${weekdayEntries[weekdayEntries.length - 1]!.label}: ${describeRange(
        weekdayEntries[0]!,
      )}`
    : weekdayEntries.map((entry) => `${entry.label}: ${describeRange(entry)}`).join(" · ");

  const saturday = find(6);
  const sunday = find(0);

  const saturdays = saturday
    ? `${saturday.label}: ${describeRange(saturday)}`
    : "Jumamosi: imefungwa";

  const sundays = sunday ? `${sunday.label}: ${describeRange(sunday)}` : "Jumapili: imefungwa";

  const lines = [weekdays, saturdays, sundays, ...(overnight ? [overnight] : [])];

  return { weekdays, saturdays, sundays, overnight, lines };
}

export interface StudioStatus {
  isOpen: boolean;
  /** "Studio ipo wazi sasa" | "Studio imefungwa" */
  label: string;
  /** "Hadi saa 21:00" | "Tunafungua kesho saa 08:30" */
  detail: string;
}

export function getStudioStatus(now: Date = new Date()): StudioStatus {
  // Nothing is "open" when there are no published hours; say so honestly
  // instead of showing a closed sign on a business that simply takes bookings.
  if (isAppointmentOnly()) {
    return {
      isOpen: false,
      label: "Tunapokea booking kwa miadi",
      detail: "Wasiliana nasi tukupange tarehe",
    };
  }

  const today = find(now.getDay());
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  if (today?.open != null && today.close != null) {
    if (minutesNow >= today.open && minutesNow < today.close) {
      const closingSoon = today.close - minutesNow <= 60;
      return {
        isOpen: true,
        label: "Studio ipo wazi sasa",
        detail: closingSoon
          ? `Inafunga saa ${formatClock(today.close)}`
          : `Hadi saa ${formatClock(today.close)}`,
      };
    }
    if (minutesNow < today.open) {
      return {
        isOpen: false,
        label: "Bado hatujafungua",
        detail: `Tunafungua leo saa ${formatClock(today.open)}`,
      };
    }
  }

  // Closed for the day — find the next opening.
  for (let offset = 1; offset <= 7; offset += 1) {
    const next = find((now.getDay() + offset) % 7);
    if (next?.open != null) {
      const when = offset === 1 ? "kesho" : next.label;
      return {
        isOpen: false,
        label: "Studio imefungwa",
        detail: `Tunafungua ${when} saa ${formatClock(next.open)}`,
      };
    }
  }

  return { isOpen: false, label: "Studio imefungwa", detail: "Tuma ombi la booking" };
}
