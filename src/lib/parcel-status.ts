import { tunisStartOfDay, tunisDayStart } from "@/lib/tz"

/** 3 statuses only. */
export const STATUS_LABEL: Record<string, string> = {
  EN_COURS: "En cours",
  PAYE: "Payé",
  RETOUR: "Retour",
}

const DAY = 86400000

/** Threshold date: parcels handed over before this are "à vérifier". */
export function verifyThreshold(delayDays: number): Date {
  return new Date(Date.now() - delayDays * DAY)
}

/**
 * Mongo filter for a named status view (Colis / Dashboard).
 * "a_verifier" = EN_COURS handed over more than delayDays ago.
 */
export function statusViewFilter(view: string, delayDays = 3): Record<string, any> {
  switch (view) {
    case "en_cours": return { status: "EN_COURS" }
    case "paye": return { status: "PAYE" }
    case "retour": return { status: "RETOUR" }
    case "a_verifier": return { status: "EN_COURS", handedToNavexAt: { $lte: verifyThreshold(delayDays) } }
    default: return {}
  }
}

/** Resolve a named date range (Africa/Tunis) into { start, end } bounds. */
export function resolveDateRange(range?: string, from?: string, to?: string): { start?: Date; end?: Date } {
  const now = new Date()
  const todayStart = tunisStartOfDay(now)
  switch (range) {
    case "today": return { start: todayStart }
    case "yesterday": return { start: new Date(todayStart.getTime() - DAY), end: todayStart }
    case "7d": return { start: new Date(now.getTime() - 7 * DAY) }
    case "30d": return { start: new Date(now.getTime() - 30 * DAY) }
    // from/to are plain YYYY-MM-DD strings from a date input, both inclusive —
    // parsed as Tunis midnight, not UTC midnight (`new Date(iso)`), or the window
    // silently shifts by an hour and can miss everything scanned near the day
    // boundary. `to` is inclusive, so the exclusive upper bound is the day after.
    case "custom": return { start: from ? tunisDayStart(from) : undefined, end: to ? new Date(tunisDayStart(to).getTime() + DAY) : undefined }
    default: return {}
  }
}

/**
 * Mongo filter for "anything active on this range" — matches if the parcel was
 * handed over, paid, OR returned within the range. No date-basis picker needed:
 * a day/range filter should surface every parcel with activity that day, not just
 * whichever single date field a user happened to select.
 */
export function activityDateFilter(range?: string, from?: string, to?: string): Record<string, any> {
  const { start, end } = resolveDateRange(range, from, to)
  if (!start && !end) return {}
  const cond: any = {}
  if (start) cond.$gte = start
  if (end) cond.$lt = end
  return { $or: [{ handedToNavexAt: cond }, { paidAt: cond }, { returnAt: cond }] }
}
