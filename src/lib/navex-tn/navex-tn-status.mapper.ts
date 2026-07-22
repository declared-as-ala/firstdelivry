/**
 * Maps Navex.tn's free-text `etat` field to our 3-status model. Only 4 example
 * values are documented ("En cours", "En attente", "Livrer Paye", "Retourné"), not
 * an exhaustive enum, so this matches by keyword rather than an exact lookup table.
 *
 * Deliberately stricter than the First Delivery mapper elsewhere in this codebase,
 * which treated plain "delivered" as "paid" and was wrong — First Delivery's own
 * data explicitly distinguishes delivered from paid. Navex.tn's "Livrer Paye" bakes
 * both into one state, so only treat it as paid when the text actually says so.
 */
export function isNavexTnPaid(etat?: string | null): boolean {
  if (!etat) return false
  return /pay[ée]|paid|r[ée]gl[ée]/i.test(etat)
}

export function isNavexTnReturned(etat?: string | null): boolean {
  if (!etat) return false
  return /retour/i.test(etat)
}

/** Best-effort simplified status for display; the raw `etat` is always kept too. */
export function mapNavexTnStatus(etat?: string | null): "EN_COURS" | "PAYE" | "RETOUR" {
  if (isNavexTnPaid(etat)) return "PAYE"
  if (isNavexTnReturned(etat)) return "RETOUR"
  return "EN_COURS"
}
