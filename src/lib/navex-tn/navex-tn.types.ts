/** The 24 Tunisian governorates, exactly as enumerated by the Navex.tn API docs. */
export const NAVEX_TN_GOUVERNORATS = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba",
  "Kairouan", "Kasserine", "Kébili", "La Manouba", "Le Kef", "Mahdia",
  "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana",
  "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
] as const

export type NavexTnGouvernorat = (typeof NAVEX_TN_GOUVERNORATS)[number]

/** Fields for "Envoi d'un colis" (POST /v1/post.php) — the only endpoint documented so far. */
export interface NavexTnCreateColisPayload {
  prix: string
  nom: string
  gouvernerat: string
  ville: string
  adresse: string
  tel: string
  tel2?: string
  designation: string
  nb_article: number | string
  msg?: string
  echange?: string
  article?: string
  nb_echange?: string
  /** "Oui" | "Non" — marketplaces only. */
  ouvrir?: string
  sender_name?: string
  sender_location?: string
  sender_gouvernorat?: string
}

/**
 * Response shape for "Envoi d'un colis". The docs' `response201` schema references a
 * `colis: Colis` field but never actually defines the `Colis` schema, and the shown
 * example response only has `status`/`status_message` — so whether (and where) a
 * tracking code comes back is UNCONFIRMED. Treat `colis` as opaque until a real
 * response has been inspected.
 */
export interface NavexTnCreateColisResponse {
  status: string
  status_message?: string
  colis?: unknown
}

/** "Récupération" (single) — POST {statusToken}/v1/post.php, body: code[, include_*]. */
export interface NavexTnStatusResponse {
  /** 1 = found. The docs never show the not-found case for the single endpoint,
   * but the multiple endpoint's `status: 0` shape strongly implies the same here. */
  status: number
  etat?: string
  motif?: string | null
  pre_etat?: string
  pre_motif?: string | null
  livreur?: string
  livreur_tel?: string
  /** Holds the tracking code when found; an error message when not found (per the
   * multiple-tracking docs — the single-tracking docs don't show the not-found case). */
  status_message?: string
  /** Only present if `include_prix=1` was sent. */
  prix?: string
  /** Only present if `include_date=1` was sent. */
  date_dernier_statut?: string
  /** Only present if `include_echange=1` was sent and an exchange exists. */
  code_echange?: string
  date_echange?: string
}

/** One entry in "Récupération Multiple"'s `results` array. */
export interface NavexTnMultiStatusItem {
  /** 1 = found, 0 = not found. */
  status: number
  code: string
  etat: string
  motif?: string | null
  pre_etat?: string
  pre_motif?: string | null
  livreur?: string
  livreur_tel?: string
  status_message: string
}

/** "Récupération Multiple" — POST {statusToken}/v1/post.php, body: codes (comma+space separated). */
export interface NavexTnMultiStatusResponse {
  status: number
  total: number
  results: NavexTnMultiStatusItem[]
}
