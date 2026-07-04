import { NavexApiLog } from "../models/NavexApiLog"
import { SystemSetting } from "../models/SystemSetting"
import {
  NavexCreateShipmentPayload,
  NavexCreateShipmentResponse,
  NavexStatusResponse,
  NavexMultiStatusResponse,
  NavexDeleteResponse,
  NavexLogEntry,
  NavexLookupResult,
  NavexParcelData,
} from "./navex.types"
import {
  NavexError,
  NavexAuthenticationError,
  NavexTimeoutError,
  NavexMissingTrackingCodeError,
} from "./navex.errors"
import { FIRST_DELIVERY_STATUS_MAP } from "./navex-status.mapper"

const DEFAULT_TIMEOUT = 15000

function getConfig() {
  return {
    apiBase: process.env.FIRST_DELIVERY_API_BASE || "https://www.firstdeliverygroup.com/api/v2",
    token: process.env.FIRST_DELIVERY_TOKEN || "",
    autoPushLabel: process.env.FIRST_DELIVERY_AUTO_PUSH_LABEL || "firstdelivery",
  }
}

function isMockMode(): boolean {
  const cfg = getConfig()
  return !cfg.token || cfg.token === "YOUR_FIRST_DELIVERY_TOKEN_HERE"
}

function mockCreateShipment(payload: NavexCreateShipmentPayload): NavexCreateShipmentResponse {
  const trackingCode = `FD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  return {
    success: true,
    tracking_code: trackingCode,
    shipment_reference: `REF-${trackingCode}`,
    message: "Colis créé avec succès (MOCK)",
  }
}

function mockGetStatus(trackingCode: string): NavexStatusResponse {
  return {
    success: true,
    status: "1",
    status_label: "En cours",
    delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

const MOCK_NAMES = ["Ryan Ouachouacha", "Ahmed Ben Ali", "Sarra Mejdoub", "Mohamed Salah", "Nadia Karray", "Karim Jelliti", "Leila Bouaziz", "Yassine Bouchiba"]
const MOCK_CITIES: [string, string][] = [["Tunis", "La Marsa"], ["Ariana", "Raoued"], ["Sfax", "Sfax"], ["Sousse", "Sousse"], ["Nabeul", "Hammamet"]]

/** Complete (non-empty) simulated parcel for local testing only. */
function mockLookup(trackingCode: string): NavexParcelData {
  const n = parseInt(trackingCode.replace(/\D/g, "").slice(-4) || "0", 10)
  const [gov, city] = MOCK_CITIES[n % MOCK_CITIES.length]
  return {
    clientName: MOCK_NAMES[n % MOCK_NAMES.length],
    clientPhone: `${50 + (n % 49)} ${String(100000 + (n % 899999))}`.slice(0, 11),
    clientAddress: `${(n % 80) + 1} Rue de la République`,
    city,
    governorate: gov,
    codAmount: 15 + (n % 60),
    designation: "1x article (taille M)",
    navexCreatedAt: new Date().toISOString(),
    navexStatusRaw: "0",
  }
}

function mockMultiStatus(trackingCodes: string[]): NavexMultiStatusResponse {
  return {
    success: true,
    shipments: trackingCodes.map((code) => ({
      tracking_code: code,
      status: "1",
      status_label: "En cours",
    })),
  }
}

async function logNavexCall(entry: NavexLogEntry): Promise<void> {
  try {
    await NavexApiLog.create({
      endpoint: entry.endpoint,
      method: entry.method,
      statusCode: entry.statusCode,
      requestBody: entry.requestBody,
      responseBody: entry.responseBody,
      errorMessage: entry.errorMessage,
      duration: entry.duration,
      trackingCode: entry.trackingCode,
      success: entry.success,
    })
  } catch {
    // Silently fail - logging should never break the app
  }
}

async function makeFirstDeliveryRequest<T>(
  url: string,
  method: string,
  body?: any,
  trackingCode?: string
): Promise<T> {
  const start = Date.now()
  const cfg = getConfig()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }

    if (cfg.token) {
      headers["Authorization"] = `Bearer ${cfg.token}`
    }

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    }

    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    clearTimeout(timeout)

    const responseText = await response.text()
    const duration = Date.now() - start

    let data: T
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { success: false, error: responseText } as unknown as T
    }

    await logNavexCall({
      endpoint: url,
      method,
      statusCode: response.status,
      requestBody: body ? JSON.stringify(body) : undefined,
      responseBody: responseText.substring(0, 2000),
      duration,
      trackingCode,
      success: response.ok,
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new NavexAuthenticationError()
      }
      throw new NavexError(
        `Erreur First Delivery: ${response.status}`,
        "FIRST_DELIVERY_API_ERROR",
        response.status,
        data
      )
    }

    return data
  } catch (error: any) {
    const duration = Date.now() - start

    if (error instanceof NavexError) {
      await logNavexCall({
        endpoint: url,
        method,
        statusCode: error.statusCode,
        requestBody: body ? JSON.stringify(body) : undefined,
        errorMessage: error.message,
        duration,
        trackingCode,
        success: false,
      })
      throw error
    }

    if ((error as Error).name === "AbortError") {
      const timeoutError = new NavexTimeoutError()
      await logNavexCall({
        endpoint: url,
        method,
        errorMessage: timeoutError.message,
        duration,
        trackingCode,
        success: false,
      })
      throw timeoutError
    }

    const unknownError = new NavexError(
      (error as Error).message || "Erreur inconnue First Delivery",
      "FIRST_DELIVERY_UNKNOWN_ERROR",
      500
    )
    await logNavexCall({
      endpoint: url,
      method,
      errorMessage: unknownError.message,
      duration,
      trackingCode,
      success: false,
    })
    throw unknownError
  }
}

export class NavexService {
  async getLocalities(): Promise<any[]> {
    if (isMockMode()) {
      return [
        { locality_id: 1, locality_name: "Ain Drahem", delegation_name: "Ain Drahem", governorate_name: "Jendouba" },
        { locality_id: 2, locality_name: "Sousse Medina", delegation_name: "Sousse", governorate_name: "Sousse" }
      ]
    }
    const cfg = getConfig()
    const url = `${cfg.apiBase}/localities`
    const res = await makeFirstDeliveryRequest<any>(url, "GET")
    return res.result || []
  }

  async createShipment(payload: NavexCreateShipmentPayload): Promise<NavexCreateShipmentResponse> {
    if (isMockMode()) {
      const result = mockCreateShipment(payload)
      await logNavexCall({
        endpoint: "MOCK /create",
        method: "POST",
        success: true,
        trackingCode: result.tracking_code,
        duration: 0,
      })
      return result
    }

    const cfg = getConfig()

    if (!payload.prix || !payload.nom || !payload.tel || !payload.gouvernerat || !payload.ville) {
      throw new NavexError(
        "Données client incomplètes pour la création du colis First Delivery",
        "FIRST_DELIVERY_INVALID_PAYLOAD",
        400
      )
    }

    let localityId: number | undefined
    try {
      const localities = await this.getLocalities()
      const match = localities.find(
        (l: any) =>
          l.governorate_name?.toLowerCase().trim() === payload.gouvernerat?.toLowerCase().trim() &&
          (l.locality_name?.toLowerCase().trim() === payload.ville?.toLowerCase().trim() ||
            l.delegation_name?.toLowerCase().trim() === payload.ville?.toLowerCase().trim())
      )
      if (match) {
        localityId = match.locality_id
      }
    } catch (e) {
      // Ignorer l'erreur d'identification de localité
    }

    const fdPayload = {
      Client: {
        nom: payload.nom,
        locality_id: localityId,
        gouvernerat: payload.gouvernerat,
        ville: payload.ville,
        adresse: payload.adresse,
        telephone: payload.tel,
        telephone2: payload.tel2 || "",
      },
      Produit: {
        prix: parseFloat(payload.prix) || 0,
        designation: payload.designation,
        nombreArticle: parseInt(payload.nb_article, 10) || 1,
        commentaire: payload.msg || "",
        article: payload.article || "",
        nombreEchange: parseInt(payload.nb_echange || "0", 10) || 0,
      }
    }

    const url = `${cfg.apiBase}/create`

    const response = await makeFirstDeliveryRequest<any>(
      url,
      "POST",
      fdPayload
    )

    const barCode = response.result?.barCode || response.barCode
    if (!barCode) {
      throw new NavexMissingTrackingCodeError()
    }

    return {
      success: !response.isError,
      tracking_code: barCode,
      shipment_reference: `REF-${barCode}`,
      message: response.message || "Colis créé avec succès",
    }
  }

  async getShipmentStatus(trackingCode: string): Promise<NavexStatusResponse> {
    if (isMockMode()) {
      const result = mockGetStatus(trackingCode)
      await logNavexCall({
        endpoint: "MOCK /status",
        method: "GET",
        success: true,
        trackingCode,
        duration: 0,
      })
      return result
    }

    const cfg = getConfig()
    const url = `${cfg.apiBase}/etat`

    try {
      const response = await makeFirstDeliveryRequest<any>(url, "POST", { barCode: trackingCode }, trackingCode)
      const resData = response.result || response
      const state = resData.state !== undefined ? String(resData.state) : "unknown"
      
      return {
        success: !response.isError,
        status: state,
        etat: state,
        status_label: FIRST_DELIVERY_STATUS_MAP[state]?.label || `Statut ${state}`,
        prix: resData.Produit?.prix !== undefined ? String(resData.Produit.prix) : undefined,
        delivery_date: resData.createdAt,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Erreur de récupération du statut",
      }
    }
  }

  async getMultipleShipmentStatuses(trackingCodes: string[]): Promise<NavexMultiStatusResponse> {
    if (trackingCodes.length === 0) {
      return { success: true, shipments: [] }
    }

    if (isMockMode()) {
      return mockMultiStatus(trackingCodes)
    }

    const shipments = []
    for (const code of trackingCodes) {
      try {
        const result = await this.getShipmentStatus(code)
        if (result.success) {
          shipments.push({
            tracking_code: code,
            status: String(result.status || ""),
            status_label: result.status_label || "",
            delivery_date: result.delivery_date,
          })
        } else {
          shipments.push({
            tracking_code: code,
            status: "unknown",
            status_label: "Erreur de synchronisation",
            error: result.error,
          })
        }
      } catch (err: any) {
        shipments.push({
          tracking_code: code,
          status: "unknown",
          status_label: "Erreur de synchronisation",
          error: err.message,
        })
      }
      // Délai de 1 seconde pour respecter la limite de fréquence (1 req/sec)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return { success: true, shipments }
  }

  async getParcelByTrackingCode(trackingCode: string): Promise<NavexLookupResult> {
    if (isMockMode()) {
      return { configured: true, found: true, mock: true, parcel: mockLookup(trackingCode) }
    }

    const cfg = getConfig()
    if (!cfg.token) {
      return { configured: false, found: false, error: "Jeton First Delivery non configuré" }
    }

    const url = `${cfg.apiBase}/etat`

    try {
      const res = await makeFirstDeliveryRequest<any>(url, "POST", { barCode: trackingCode }, trackingCode)
      const resData = res.result
      
      const hasData = res && !res.isError && resData && (resData.Client || resData.Produit)
      if (!hasData) return { configured: true, found: false }

      const client = resData.Client || {}
      const produit = resData.Produit || {}

      const parcel: NavexParcelData = {
        clientName: client.nom || "",
        clientPhone: client.telephone || "",
        clientAddress: client.adresse || "",
        city: client.ville || "",
        governorate: client.gouvernerat || "",
        codAmount: parseFloat(String(produit.prix || 0)) || 0,
        designation: produit.designation || produit.article || "",
        navexCreatedAt: resData.createdAt || undefined,
        navexStatusRaw: String(resData.state !== undefined ? resData.state : "0"),
      }
      return { configured: true, found: true, parcel }
    } catch (error: any) {
      return { configured: true, found: false, error: error.message || "Erreur de recherche First Delivery" }
    }
  }

  async deleteShipment(trackingCode: string): Promise<NavexDeleteResponse> {
    if (isMockMode()) {
      return { success: true, message: "Colis supprimé (MOCK)" }
    }

    const cfg = getConfig()
    const url = `${cfg.apiBase}/cancel-orders`

    try {
      const response = await makeFirstDeliveryRequest<any>(url, "POST", { barCodes: [trackingCode] }, trackingCode)
      return {
        success: !response.isError,
        message: response.message || "Colis supprimé",
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Erreur de suppression",
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (isMockMode()) {
      return {
        success: true,
        message: "Mode démonstration activé (pas de token configuré)",
      }
    }

    try {
      const cfg = getConfig()
      const url = `${cfg.apiBase}/localities`
      await makeFirstDeliveryRequest(url, "GET")
      return { success: true, message: "Connexion First Delivery réussie" }
    } catch (error) {
      return {
        success: false,
        message: error instanceof NavexError ? error.message : "Erreur de connexion inconnue",
      }
    }
  }
}

export const navexService = new NavexService()
