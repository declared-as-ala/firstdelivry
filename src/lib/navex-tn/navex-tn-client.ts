import {
  NavexTnCreateColisPayload,
  NavexTnCreateColisResponse,
  NavexTnStatusResponse,
  NavexTnMultiStatusResponse,
} from "./navex-tn.types"

const DEFAULT_TIMEOUT = 15000

export class NavexTnError extends Error {
  constructor(message: string, public statusCode?: number, public raw?: unknown) {
    super(message)
    this.name = "NavexTnError"
  }
}

function getConfig() {
  return {
    apiBase: process.env.NAVEX_TN_API_BASE || "https://app.navex.tn/api",
    addToken: process.env.NAVEX_TN_ADD_TOKEN || "",
    statusToken: process.env.NAVEX_TN_STATUS_TOKEN || "",
    deleteToken: process.env.NAVEX_TN_DELETE_TOKEN || "",
  }
}

export function isNavexTnConfigured(): boolean {
  return Boolean(getConfig().addToken)
}

export function isNavexTnStatusConfigured(): boolean {
  return Boolean(getConfig().statusToken)
}

/**
 * Every Navex.tn endpoint seen so far shares the same shape: POST to
 * {apiBase}/{token}/v1/post.php with a form-encoded body (despite the docs
 * claiming `application/json`) and the token embedded in the URL path itself
 * (despite `CURLAUTH_BASIC` appearing in their examples with no credentials
 * ever supplied). This mirrors the vendor's own proven-working curl examples
 * rather than their self-contradictory stated spec.
 */
async function postForm(token: string, params: Record<string, string>): Promise<any> {
  const cfg = getConfig()
  const url = `${cfg.apiBase}/${token}/v1/post.php`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

  let res: Response
  try {
    res = await fetch(url, { method: "POST", body: new URLSearchParams(params), signal: controller.signal })
  } catch (err: any) {
    if (err?.name === "AbortError") throw new NavexTnError("Délai dépassé lors de la requête Navex.tn")
    throw new NavexTnError(err?.message || "Erreur réseau Navex.tn")
  } finally {
    clearTimeout(timeout)
  }

  const text = await res.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    data = { status: "unknown", status_message: text.slice(0, 500) }
  }

  if (!res.ok) {
    throw new NavexTnError(data?.status_message || `Erreur Navex.tn (HTTP ${res.status})`, res.status, data)
  }
  return data
}

/** "Envoi d'un colis" — creates a new shipment on Navex.tn. */
export async function createColis(payload: NavexTnCreateColisPayload): Promise<NavexTnCreateColisResponse> {
  const cfg = getConfig()
  if (!cfg.addToken) throw new NavexTnError("NAVEX_TN_ADD_TOKEN non configuré")

  const data = await postForm(cfg.addToken, {
    prix: String(payload.prix),
    nom: payload.nom,
    gouvernerat: payload.gouvernerat,
    ville: payload.ville,
    adresse: payload.adresse,
    tel: payload.tel,
    tel2: payload.tel2 ?? "",
    designation: payload.designation,
    nb_article: String(payload.nb_article),
    msg: payload.msg ?? "",
    echange: payload.echange ?? "",
    article: payload.article ?? "",
    nb_echange: payload.nb_echange ?? "",
    ouvrir: payload.ouvrir ?? "",
    sender_name: payload.sender_name ?? "",
    sender_location: payload.sender_location ?? "",
    sender_gouvernorat: payload.sender_gouvernorat ?? "",
  })

  if (/erreur/i.test(String(data?.status_message ?? "")) || /error/i.test(String(data?.status ?? ""))) {
    throw new NavexTnError(data?.status_message || "Erreur lors de la création du colis Navex.tn", undefined, data)
  }
  return data as NavexTnCreateColisResponse
}

/** "Récupération" — status of a single parcel by tracking code. */
export async function getColisStatus(
  code: string,
  opts?: { includePrix?: boolean; includeDate?: boolean; includeEchange?: boolean }
): Promise<NavexTnStatusResponse> {
  const cfg = getConfig()
  if (!cfg.statusToken) throw new NavexTnError("NAVEX_TN_STATUS_TOKEN non configuré")

  const params: Record<string, string> = { code }
  if (opts?.includePrix) params.include_prix = "1"
  if (opts?.includeDate) params.include_date = "1"
  if (opts?.includeEchange) params.include_echange = "1"

  const data = await postForm(cfg.statusToken, params)
  return data as NavexTnStatusResponse
}

/**
 * "Récupération Multiple" — status of several parcels in one call. Same token/URL
 * as the single lookup; distinguished only by `codes` (plural, comma+space
 * separated) instead of `code`.
 */
export async function getMultipleColisStatus(codes: string[]): Promise<NavexTnMultiStatusResponse> {
  const cfg = getConfig()
  if (!cfg.statusToken) throw new NavexTnError("NAVEX_TN_STATUS_TOKEN non configuré")
  if (codes.length === 0) return { status: 1, total: 0, results: [] }

  const data = await postForm(cfg.statusToken, { codes: codes.join(", ") })
  return data as NavexTnMultiStatusResponse
}
