export interface FirstDeliveryClient {
  nom: string
  locality_id?: number
  gouvernerat: string
  ville: string
  adresse: string
  telephone: string
  telephone2?: string
}

export interface FirstDeliveryProduit {
  prix: number
  designation: string
  nombreArticle: number
  commentaire?: string
  article?: string
  nombreEchange?: number
}

export interface FirstDeliveryCreatePayload {
  Client: FirstDeliveryClient
  Produit: FirstDeliveryProduit
}

export interface FirstDeliveryLocalitiesResponse {
  status: number
  isError: boolean
  message: string
  result: Array<{
    locality_id: number
    locality_name: string
    delegation_name: string
    governorate_name: string
  }>
}

export interface FirstDeliveryEtatResponse {
  status: number
  isError: boolean
  message: string
  result?: {
    barCode: string
    state: number
    Client?: FirstDeliveryClient
    Produit?: FirstDeliveryProduit
    createdAt?: string
  }
}

export interface NavexCreateShipmentPayload {
  prix: string
  nom: string
  gouvernerat: string
  ville: string
  adresse: string
  tel: string
  tel2?: string
  designation: string
  nb_article: string
  msg?: string
  echange?: string
  article?: string
  nb_echange?: string
  ouvrir?: string
}

export interface NavexCreateShipmentResponse {
  success: boolean
  tracking_code?: string
  shipment_reference?: string
  message?: string
  error?: string
}

export interface NavexStatusResponse {
  success: boolean
  status?: number | string
  etat?: string
  motif?: string | null
  pre_etat?: string
  pre_motif?: string | null
  livreur?: string
  livreur_tel?: string
  status_message?: string
  prix?: string
  date_dernier_statut?: string
  status_label?: string
  delivery_date?: string
  recipient_name?: string
  error?: string
}

export interface NavexMultiStatusResponse {
  success: boolean
  shipments?: Array<{
    tracking_code: string
    status: string
    status_label: string
    delivery_date?: string
    error?: string
  }>
  error?: string
}

export interface NavexDeleteResponse {
  success: boolean
  message?: string
  error?: string
}

export interface NavexParcelData {
  clientName: string
  clientPhone: string
  clientAddress: string
  city: string
  governorate: string
  codAmount: number
  designation: string
  navexCreatedAt?: string
  navexStatusRaw: string
}

export interface NavexLookupResult {
  /** false when no lookup endpoint/token is configured */
  configured: boolean
  /** true when carrier returned a real parcel for the code */
  found: boolean
  parcel?: NavexParcelData
  /** true only in mock mode (no token) — data is simulated for local testing */
  mock?: boolean
  error?: string
}

export interface NavexLogEntry {
  endpoint: string
  method: string
  statusCode?: number
  requestBody?: string
  responseBody?: string
  errorMessage?: string
  duration?: number
  trackingCode?: string
  success: boolean
}

