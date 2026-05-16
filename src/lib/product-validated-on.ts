/** `YYYY-MM-DD` for `<input type="date">` from Payload ISO date */
export function validatedOnToInputValue(
  iso: string | null | undefined
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `YYYY-MM-DD` → Payload ISO date, or `null` when invalid */
export function dateInputToIsoSafe(ymd: string): string | null {
  const t = ymd.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Store noon UTC so the calendar day is stable when round-tripping */
export function dateInputToIso(ymd: string): string {
  const iso = dateInputToIsoSafe(ymd);
  if (!iso) throw new Error("Invalid validated date");
  return iso;
}

/** Normalize `validatedOn` from the admin form / tRPC (string, Date via superjson, empty). */
export function validatedOnInputToPayloadIso(vRaw: unknown): string | null {
  if (vRaw == null) return null;
  if (typeof vRaw === "string") {
    const s = vRaw.trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return dateInputToIsoSafe(s);
    const parsed = Date.parse(s);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  if (vRaw instanceof Date) {
    return Number.isNaN(vRaw.getTime()) ? null : vRaw.toISOString();
  }
  return null;
}
