/** Today's date as YYYY-MM-DD in the Africa/Tunis timezone. */
export function tunisDateISO(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/** Start of today (00:00) in Africa/Tunis, returned as a UTC Date. */
export function tunisStartOfDay(d: Date = new Date()): Date {
  const iso = tunisDateISO(d) // YYYY-MM-DD in Tunis
  return tunisDayStart(iso)
}

/**
 * Midnight (00:00) of a given YYYY-MM-DD calendar day in Africa/Tunis, as a UTC Date.
 * Use this instead of `new Date(iso)` for any user-picked day: a bare "YYYY-MM-DD"
 * string parses as UTC midnight, which is an hour off from Tunis midnight and can
 * silently exclude/include records near the day boundary.
 */
export function tunisDayStart(iso: string): Date {
  // Tunisia is UTC+1 (no DST since 2009)
  return new Date(`${iso}T00:00:00+01:00`)
}
