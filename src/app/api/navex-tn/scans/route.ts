import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { NavexTnParcel } from "@/lib/models/NavexTnParcel"
import { NavexTnParcelScan } from "@/lib/models/NavexTnParcelScan"
import { scanSchema } from "@/lib/validators"
import { getColisStatus, NavexTnError, isNavexTnStatusConfigured } from "@/lib/navex-tn/navex-tn-client"
import { mapNavexTnStatus } from "@/lib/navex-tn/navex-tn-status.mapper"

const SCAN_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE_OPERATOR"]

function parcelInfo(p: any) {
  return {
    id: String(p._id),
    trackingCode: p.trackingCode,
    codAmount: p.codAmount,
    status: p.status,
    navexRawEtat: p.navexRawEtat,
    livreur: p.livreur,
    livreurTel: p.livreurTel,
    handedToNavexAt: p.handedToNavexAt,
    paidAt: p.paidAt,
    returnAt: p.returnAt,
  }
}

function frDate(d?: Date) {
  return d ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short", timeStyle: "short" }).format(d) : ""
}

/**
 * Barcode scan endpoint for Navex.tn parcels. Modes:
 *  - HANDOVER_PREP  : confirms the code exists on Navex.tn (via Récupération), then
 *                     records it as EN_COURS. Client name/phone/designation are NOT
 *                     available from Navex.tn's API and are left empty.
 *  - RETURN_RECEIVE : manual, same as First Delivery — never decided by carrier status.
 *  - VERIFY         : read-only Récupération lookup, no local record required.
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
    try { await NavexTnParcelScan.create({ parcelId: parcelId || undefined, trackingCode, mode, result, message, operatorId: session!.user.id, stationName }) } catch { /* best-effort */ }
  }
  function reject(code: string, message: string, parcel?: any) {
    return NextResponse.json({ success: false, result: code, error: { code, message }, parcel: parcel ? parcelInfo(parcel) : undefined })
  }

  if (!isNavexTnStatusConfigured()) {
    return NextResponse.json({ success: false, error: { code: "NOT_CONFIGURED", message: "Navex.tn n'est pas configuré (NAVEX_TN_STATUS_TOKEN manquant)." } }, { status: 503 })
  }

  try {
    const existing = await NavexTnParcel.findOne({ trackingCode })

    if (mode === "VERIFY") {
      try {
        const remote = await getColisStatus(trackingCode, { includePrix: true, includeDate: true })
        if (remote.status !== 1) { await log("UNKNOWN", existing?._id, "Introuvable chez Navex.tn"); return reject("UNKNOWN", "Code introuvable chez Navex.tn.") }
        await log("OK", existing?._id, "Vérification")
        return NextResponse.json({
          success: true, result: "OK",
          parcel: existing ? parcelInfo(existing) : { trackingCode, status: mapNavexTnStatus(remote.etat), navexRawEtat: remote.etat, livreur: remote.livreur, livreurTel: remote.livreur_tel, codAmount: remote.prix ? parseFloat(remote.prix) : undefined },
        })
      } catch (err: any) {
        await log("UNKNOWN", null, err?.message)
        return reject("API_ERROR", `Erreur technique Navex.tn (${err?.message || "inconnue"}).`)
      }
    }

    if (mode === "RETURN_RECEIVE") {
      if (!existing) { await log("UNKNOWN", null, "Introuvable"); return reject("UNKNOWN", "Ce colis n'a jamais été remis à Navex.tn.") }
      if (existing.status === "PAYE") { await log("BLOCKED", existing._id, "Déjà payé"); return reject("ALREADY_PAID", "Ce colis est déjà Payé. Impossible de le marquer Retour.", existing) }
      if (existing.status === "RETOUR") {
        const when = frDate(existing.returnAt as Date | undefined)
        await log("DUPLICATE", existing._id, "Retour déjà enregistré")
        return reject("DUPLICATE", when ? `Retour déjà enregistré le ${when}.` : "Retour déjà enregistré.", existing)
      }
      existing.status = "RETOUR"
      existing.returnAt = new Date()
      existing.returnBy = session.user.id as any
      await existing.save()
      await log("OK", existing._id, "Retour enregistré")
      return NextResponse.json({ success: true, result: "OK", parcel: parcelInfo(existing) })
    }

    // ---------------- HANDOVER_PREP ----------------
    if (existing) {
      const when = frDate(existing.handedToNavexAt as Date | undefined)
      await log("DUPLICATE", existing._id, "Déjà En cours")
      return reject("ALREADY_EN_COURS", when ? `Ce colis est déjà En cours depuis le ${when}.` : "Ce colis est déjà En cours.", existing)
    }

    let remote
    try {
      remote = await getColisStatus(trackingCode, { includePrix: true })
    } catch (err: any) {
      await log("UNKNOWN", null, err?.message)
      return reject("API_ERROR", `Erreur technique lors de la vérification chez Navex.tn (${err?.message || "inconnue"}). Veuillez réessayer.`)
    }

    if (remote.status !== 1) {
      await log("UNKNOWN", null, "Introuvable chez Navex.tn")
      return reject("UNKNOWN", "Code introuvable chez Navex.tn. Aucun colis n'a été enregistré.")
    }

    const status = mapNavexTnStatus(remote.etat)
    const now = new Date()
    const created = await NavexTnParcel.create({
      trackingCode,
      codAmount: remote.prix ? parseFloat(remote.prix) : undefined,
      status,
      navexRawEtat: remote.etat,
      navexRawMotif: remote.motif || undefined,
      livreur: remote.livreur || undefined,
      livreurTel: remote.livreur_tel || undefined,
      handedToNavexAt: now,
      lastSyncAt: now,
      paidAt: status === "PAYE" ? now : undefined,
      returnAt: status === "RETOUR" ? now : undefined,
      scannedBy: session.user.id,
    })
    await log("OK", created._id, "Colis remis à Navex.tn")

    return NextResponse.json({ success: true, result: "OK", parcel: parcelInfo(created) })
  } catch (error: any) {
    if (error instanceof NavexTnError) {
      return NextResponse.json({ success: false, error: { code: "SCAN_ERROR", message: error.message } }, { status: 500 })
    }
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
  const scans = await NavexTnParcelScan.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
  return NextResponse.json({ success: true, data: scans })
}
