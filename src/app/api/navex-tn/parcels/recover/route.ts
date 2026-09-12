import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { NavexTnParcel } from "@/lib/models/NavexTnParcel"
import { NavexTnParcelScan } from "@/lib/models/NavexTnParcelScan"
import { getColisStatus, isNavexTnStatusConfigured } from "@/lib/navex-tn/navex-tn-client"
import { isNavexTnPaid } from "@/lib/navex-tn/navex-tn-status.mapper"

async function authorize() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  if (!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }
  await connectDB()
}

// Only successful handovers prove a parcel was recorded; verification and failed
// scans must never create recovery candidates.
export async function GET() {
  const denied = await authorize()
  if (denied) return denied
  const candidates = await NavexTnParcelScan.distinct("trackingCode", { mode: "HANDOVER_PREP", result: "OK" })
  const existing = await NavexTnParcel.distinct("trackingCode", { trackingCode: { $in: candidates } })
  const present = new Set(existing)
  return NextResponse.json({ codes: candidates.filter((code: string) => !present.has(code)), scanned: candidates.length })
}

// One parcel per request keeps recovery resumable even on short request limits.
export async function POST(req: NextRequest) {
  const denied = await authorize()
  if (denied) return denied
  const body = await req.json().catch(() => null)
  if (typeof body?.code !== "string" || !body.code.trim() || body.code.length > 200) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 })
  }
  const trackingCode = body.code.trim()
  if (await NavexTnParcel.exists({ trackingCode })) return NextResponse.json({ restored: false })
  const handover = await NavexTnParcelScan.findOne({ trackingCode, mode: "HANDOVER_PREP", result: "OK" }).sort({ createdAt: 1 }).lean()
  if (!handover) return NextResponse.json({ error: "Aucun scan de remise à récupérer" }, { status: 404 })
  if (!isNavexTnStatusConfigured()) return NextResponse.json({ error: "Token Navex.tn manquant" }, { status: 503 })

  try {
    const remote = await getColisStatus(trackingCode, { includePrix: true })
    if (remote.status !== 1) return NextResponse.json({ error: "Colis introuvable chez Navex.tn" }, { status: 422 })
    const returned = await NavexTnParcelScan.findOne({ trackingCode, mode: "RETURN_RECEIVE", result: "OK", createdAt: { $gte: handover.createdAt } }).sort({ createdAt: -1 }).lean()
    const now = new Date()
    const price = remote.prix?.trim() ? Number(remote.prix) : NaN
    const status = returned ? "RETOUR" : isNavexTnPaid(remote.etat) ? "PAYE" : "EN_COURS"
    const result = await NavexTnParcel.updateOne({ trackingCode }, { $setOnInsert: {
      ...(handover.parcelId ? { _id: handover.parcelId } : {}),
      trackingCode,
      codAmount: Number.isFinite(price) && price >= 0 ? price : undefined,
      status,
      navexRawEtat: remote.etat,
      navexRawMotif: remote.motif || undefined,
      livreur: remote.livreur || undefined,
      livreurTel: remote.livreur_tel || undefined,
      handedToNavexAt: handover.createdAt,
      scannedBy: handover.operatorId,
      returnAt: returned?.createdAt,
      returnBy: returned?.operatorId,
      // Historical payment time is unknown; do not invent one.
      lastSyncAt: now,
      createdAt: handover.createdAt,
      updatedAt: now,
    } }, { upsert: true, timestamps: false, runValidators: true })
    return NextResponse.json({ restored: result.upsertedCount === 1 })
  } catch (error) {
    // A concurrent recovery/scan may have inserted this parcel first.
    if (await NavexTnParcel.exists({ trackingCode })) return NextResponse.json({ restored: false })
    console.error("Navex parcel recovery failed", error instanceof Error ? error.name : "UnknownError")
    return NextResponse.json({ error: "Récupération impossible pour ce colis. Réessayez." }, { status: 502 })
  }
}
