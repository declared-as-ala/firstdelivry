export const FIRST_DELIVERY_STATUS_MAP: Record<string, { logistics: string; payment?: string; warehouse?: string; label: string }> = {
  "0": { logistics: "NAVEX_CREATED", payment: "COD_EXPECTED", warehouse: "PACKED", label: "En attente" },
  "1": { logistics: "IN_TRANSIT", label: "En cours" },
  "2": { logistics: "DELIVERED", payment: "DELIVERED_UNPAID", label: "Livré" },
  "3": { logistics: "IN_TRANSIT", label: "Echange" },
  "5": { logistics: "RETURN_IN_TRANSIT", warehouse: "RETURN_EXPECTED", label: "Retour Expéditeur" },
  "6": { logistics: "CANCELLED", payment: "NOT_APPLICABLE", label: "Supprimé" },
  "7": { logistics: "RETURN_IN_TRANSIT", warehouse: "RETURN_EXPECTED", label: "Rtn client/agence" },
  "8": { logistics: "IN_TRANSIT", label: "Au magasin" },
  "11": { logistics: "RETURN_IN_TRANSIT", warehouse: "RETURN_EXPECTED", label: "Rtn dépôt" },
  "20": { logistics: "EXCEPTION", label: "A vérifier" },
  "30": { logistics: "RETURN_RECEIVED", warehouse: "RETURN_RECEIVED", label: "Retour reçu" },
  "31": { logistics: "RETURN_RECEIVED", warehouse: "RETURN_RECEIVED", label: "Rtn définitif" },
  "100": { logistics: "NAVEX_CREATED", payment: "COD_EXPECTED", label: "Demande d'enlèvement" },
  "101": { logistics: "NAVEX_CREATED", label: "Demande d'enlèvement assignée" },
  "102": { logistics: "NAVEX_CREATED", label: "En cours d'enlèvement" },
  "103": { logistics: "NAVEX_CREATED", label: "Enlevé" },
  "104": { logistics: "CANCELLED", label: "Demande d'enlèvement annulé" },
  "201": { logistics: "RETURN_IN_TRANSIT", warehouse: "RETURN_EXPECTED", label: "Retour assigné" },
  "202": { logistics: "RETURN_IN_TRANSIT", warehouse: "RETURN_EXPECTED", label: "Retour en cours d'expédition" },
  "203": { logistics: "RETURN_IN_TRANSIT", warehouse: "RETURN_EXPECTED", label: "Retour enlevé" },
  "204": { logistics: "CANCELLED", label: "Retour Annulé" },
}

export const NAVEX_STATUS_MAP = FIRST_DELIVERY_STATUS_MAP

export function mapNavexStatus(navexStatus: string): {
  logistics: string
  payment?: string
  warehouse?: string
  label: string
} {
  const normalized = navexStatus?.toLowerCase().trim()
  if (FIRST_DELIVERY_STATUS_MAP[normalized]) {
    return FIRST_DELIVERY_STATUS_MAP[normalized]
  }
  if (/(annul|cancel)/.test(normalized)) return { logistics: "CANCELLED", label: "Annulé" }
  if (/(livr|deliver)/.test(normalized)) return { logistics: "DELIVERED", payment: "DELIVERED_UNPAID", label: "Livré" }
  if (/(retour|return|refus|rtn)/.test(normalized)) return { logistics: "RETURN_IN_TRANSIT", warehouse: "RETURN_EXPECTED", label: "Retour" }
  if (/(en[_ ]?cours|in[_ ]?transit)/.test(normalized)) return { logistics: "IN_TRANSIT", label: "En cours" }

  return {
    logistics: "EXCEPTION",
    label: `Statut inconnu: ${navexStatus}`,
  }
}

/** Map a raw Navex status string to the simplified NavexStatus used by parcels. */
export function mapToSimpleNavexStatus(
  navexStatus: string
): "PENDING" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RETURN" | "CANCELLED" | "UNKNOWN" {
  const n = navexStatus?.toLowerCase().trim() || ""
  if (!n) return "UNKNOWN"
  
  if (n === "0" || n.startsWith("10")) return "PENDING"
  if (n === "1" || n === "8" || n === "3") return "IN_TRANSIT"
  if (n === "2") return "DELIVERED"
  if (n === "5" || n === "7" || n === "11" || n === "30" || n === "31" || (n.startsWith("20") && n !== "20" && n !== "204")) return "RETURN"
  if (n === "6" || n === "204") return "CANCELLED"

  if (/(annul|cancel)/.test(n)) return "CANCELLED"
  if (/(en[_ ]?cours[_ ]?(de[_ ]?)?livraison|out[_ ]?for|en[_ ]?livraison)/.test(n)) return "OUT_FOR_DELIVERY"
  if (/(en[_ ]?attente|pending|cree|créé|pris[_ ]?en[_ ]?charge|enl[eè]vement)/.test(n)) return "PENDING"
  if (/(en[_ ]?cours|in[_ ]?transit|achemin|magasin)/.test(n)) return "IN_TRANSIT"
  if (/(livr|deliver|paye|payé)/.test(n)) return "DELIVERED"
  if (/(retour|return|refus|rtn)/.test(n)) return "RETURN"
  return "UNKNOWN"
}

/** Does a raw Navex status indicate the COD has been paid? */
export function isNavexPaid(navexStatus: string): boolean {
  const n = navexStatus?.toLowerCase().trim() || ""
  if (n === "2") return true
  if (/non[_ ]?paye|non[_ ]?payé|impaye|impayé/.test(n)) return false
  return /(paye|payé|paid|regl|réglé|livre|livré)/.test(n)
}

export function mapNavexRecetteStatus(navexStatus: string): "delivered" | "returned" | "unknown" {
  const normalized = navexStatus?.toLowerCase().trim()
  if (normalized === "2" || ["livre", "livré", "livre_non_paye", "livré non payé", "paye", "payé"].includes(normalized)) return "delivered"
  if (["5", "7", "11", "30", "31", "201", "202", "203"].includes(normalized) || /(retour|return|refus|rtn|annul|cancel)/.test(normalized)) return "returned"
  return "unknown"
}

