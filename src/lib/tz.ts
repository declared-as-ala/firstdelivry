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
  // Tunisia is UTC+1 (no DST since 2009)
  return new Date(`${iso}T00:00:00+01:00`)
}
