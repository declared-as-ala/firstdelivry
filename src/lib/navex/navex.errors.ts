export class NavexError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = "NavexError"
  }
}

export class NavexAuthenticationError extends NavexError {
  constructor(message = "Authentication échouée avec Navex") {
    super(message, "NAVEX_AUTH_ERROR", 401)
    this.name = "NavexAuthenticationError"
  }
}

export class NavexValidationError extends NavexError {
  constructor(message: string, details?: unknown) {
    super(message, "NAVEX_VALIDATION_ERROR", 400, details)
    this.name = "NavexValidationError"
  }
}

export class NavexTimeoutError extends NavexError {
  constructor(message = "Timeout de la requête Navex") {
    super(message, "NAVEX_TIMEOUT", 504)
    this.name = "NavexTimeoutError"
  }
}

export class NavexDuplicateShipmentError extends NavexError {
  constructor(trackingCode?: string) {
    super(
      trackingCode
        ? `Un colis Navex existe déjà avec le code ${trackingCode}`
        : "Un colis Navex existe déjà pour cette commande",
      "NAVEX_DUPLICATE_SHIPMENT",
      409
    )
    this.name = "NavexDuplicateShipmentError"
  }
}

export class NavexMissingTrackingCodeError extends NavexError {
  constructor() {
    super(
      "La réponse Navex ne contient pas de code de suivi",
      "NAVEX_MISSING_TRACKING_CODE",
      500
    )
    this.name = "NavexMissingTrackingCodeError"
  }
}

export function isNavexError(error: unknown): error is NavexError {
  return error instanceof NavexError
}
