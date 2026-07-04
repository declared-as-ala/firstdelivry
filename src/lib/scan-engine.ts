/**
 * Pure scan-decision engine, shared by POST /api/scans and the test scenario.
 */
import type { IOrder } from "@/lib/models/Order"

export type ScanResult = "OK" | "DUPLICATE" | "BLOCKED"

export interface ScanDecision {
  ok: boolean
  result: ScanResult
  code: string
  message: string
  mutate?: (p: IOrder) => void
}

function frDate(d?: Date) {
  return d ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short", timeStyle: "short" }).format(d) : ""
}

/** "Remise à Navex" for an already-known parcel → duplicate. */
export function decideRemiseExisting(parcel: Pick<IOrder, "handedToNavexAt">): ScanDecision {
  const when = frDate(parcel.handedToNavexAt as Date | undefined)
  return {
    ok: false, result: "DUPLICATE", code: "ALREADY_EN_COURS",
    message: when ? `Ce colis est déjà En cours depuis le ${when}.` : "Ce colis est déjà En cours.",
  }
}

/** "Retour reçu" → RETOUR. Blocked if already Payé; duplicate if already Retour. */
export function decideReturnReceive(parcel: Pick<IOrder, "status" | "returnAt">): ScanDecision {
  if (parcel.status === "PAYE") {
    return { ok: false, result: "BLOCKED", code: "ALREADY_PAID", message: "Ce colis est déjà Payé. Impossible de le marquer Retour." }
  }
  if (parcel.status === "RETOUR") {
    const when = frDate(parcel.returnAt as Date | undefined)
    return { ok: false, result: "DUPLICATE", code: "DUPLICATE", message: when ? `Retour déjà enregistré le ${when}.` : "Retour déjà enregistré." }
  }
  return {
    ok: true, result: "OK", code: "OK", message: "Retour enregistré",
    mutate: (p) => { p.status = "RETOUR"; p.returnAt = new Date() },
  }
}
