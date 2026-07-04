import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { ParcelScan } from "@/lib/models/ParcelScan"
import { scanSchema } from "@/lib/validators"
import { decideRemiseExisting, decideReturnReceive } from "@/lib/scan-engine"
import { navexService } from "@/lib/navex/navex-client"

const SCAN_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE_OPERATOR"]

function parcelInfo(p: any) {
  return {
    id: String(p._id),
    navexTrackingCode: p.navexTrackingCode,
    codAmount: p.codAmount,
    designation: p.designation || "",
    navexCreatedAt: p.navexCreatedAt,
    status: p.status,
    handedToNavexAt: p.handedToNavexAt,
    paidAt: p.paidAt,
    returnAt: p.returnAt,
  }
}

/**
 * Barcode scan endpoint. Modes:
 *  - HANDOVER_PREP  : "Remise à Navex" → fetch real Navex data, create as EN_COURS.
 *  - RETURN_RECEIVE : "Retour reçu"    → set RETOUR (manual; blocked if Payé).
 *  - VERIFY         : read-only lookup.
 * Never fabricates parcels; never uses Navex to decide a return.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Non authentifié" } }, { status: 401 })
  if (!SCAN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Accès refusé" } }, { status: 403 })
  }

  await connectDB()
  const parsed = scanSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } }, { status: 400 })

  const { mode, stationName } = parsed.data
  const trackingCode = parsed.data.trackingCode.trim().replace(/[\r\n]+$/g, "").trim()

  async function log(result: string, parcelId: any, message?: string) {
    try { await ParcelScan.create({ parcelId: parcelId || undefined, navexTrackingCode: trackingCode, mode, result, message, operatorId: session!.user.id, stationName }) } catch { /* best-effort */ }
  }
  function reject(code: string, message: string, parcel?: any) {
    return NextResponse.json({ success: false, result: code, error: { code, message }, parcel: parcel ? parcelInfo(parcel) : undefined })
  }

  try {
    const existing = await Order.findOne({ navexTrackingCode: trackingCode })

    if (mode === "VERIFY") {
      if (!existing) { await log("UNKNOWN", null, "Introuvable"); return reject("UNKNOWN", "Code Navex introuvable. Ce colis n'a pas encore été scanné.") }
      await log("OK", existing._id, "Vérification")
      return NextResponse.json({ success: true, result: "OK", parcel: parcelInfo(existing) })
    }

    if (mode === "RETURN_RECEIVE") {
      if (!existing) { await log("UNKNOWN", null, "Introuvable"); return reject("UNKNOWN", "Code Navex introuvable. Ce colis n'a jamais été remis à Navex.") }
      const decision = decideReturnReceive(existing)
      if (!decision.ok) { await log(decision.result, existing._id, decision.message); return reject(decision.code, decision.message, existing) }
      decision.mutate?.(existing)
      existing.returnBy = session.user.id as any
      await existing.save()
      await log("OK", existing._id, decision.message)
      return NextResponse.json({ success: true, result: "OK", parcel: parcelInfo(existing) })
    }

    // ---------------- HANDOVER_PREP (Remise à Navex) ----------------
    if (existing) {
      const decision = decideRemiseExisting(existing)
      await log(decision.result, existing._id, decision.message)
      return reject(decision.code, decision.message, existing)
    }

    const lookup = await navexService.getParcelByTrackingCode(trackingCode)
    if (!lookup.configured) { await log("BLOCKED", null, "First Delivery non configuré"); return reject("NOT_CONFIGURED", "Recherche First Delivery indisponible. Configurez l'endpoint dans Paramètres.") }
    if (!lookup.found || !lookup.parcel) { await log("UNKNOWN", null, "Introuvable chez First Delivery"); return reject("UNKNOWN", "Code First Delivery introuvable chez First Delivery. Aucun colis n'a été créé.") }

    const d = lookup.parcel
    const created = await Order.create({
      navexTrackingCode: trackingCode,
      codAmount: d.codAmount,
      designation: d.designation || undefined,
      navexCreatedAt: d.navexCreatedAt ? new Date(d.navexCreatedAt) : undefined,
      status: "EN_COURS",
      navexRawStatus: d.navexStatusRaw,
      handedToNavexAt: new Date(),
      lastNavexSyncAt: new Date(),
      scannedBy: session.user.id,
    })
    await log("OK", created._id, "Colis remis à Navex")
    return NextResponse.json({ success: true, result: "OK", parcel: parcelInfo(created) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SCAN_ERROR", message: error.message || "Erreur lors du scan" } }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  await connectDB()
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("mode") || undefined
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
  const filter: any = {}
  if (mode) filter.mode = mode
  const scans = await ParcelScan.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
  return NextResponse.json({ success: true, data: scans })
}
