import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { NavexTnParcel } from "@/lib/models/NavexTnParcel"
import { getMultipleColisStatus, isNavexTnStatusConfigured } from "@/lib/navex-tn/navex-tn-client"
import { isNavexTnPaid } from "@/lib/navex-tn/navex-tn-status.mapper"

const SYNC_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE"]
// Navex.tn's "Récupération Multiple" checks many codes in one call, unlike First
// Delivery which only offers single lookups under a 1/sec limit — so a much larger
// batch per request is fine here. No documented rate limit either way.
const BATCH_SIZE = 50

/**
 * "Synchroniser les paiements Navex.tn" — mirrors /api/parcels/sync's architecture
 * (fixed snapshot queue, short batch calls instead of a long-lived stream) but uses
 * Navex.tn's genuine bulk status endpoint instead of one call per parcel.
 *
 * Only ever advances EN_COURS → PAYE, exactly like the First Delivery sync — RETOUR
 * is never set from a carrier status, only from a physical "Retour reçu" scan.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  if (!SYNC_ROLES.includes(session.user.role as string)) return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 })

  if (!isNavexTnStatusConfigured()) {
    return NextResponse.json({ success: false, error: { code: "NOT_CONFIGURED", message: "Synchronisation Navex.tn indisponible (NAVEX_TN_STATUS_TOKEN manquant)." } }, { status: 503 })
  }

  await connectDB()

  const body = await request.json().catch(() => null)
  const requestedIds: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined

  let queue: { _id: any; trackingCode: string }[]
  if (requestedIds) {
    const docs = await NavexTnParcel.find({ _id: { $in: requestedIds }, status: "EN_COURS" }).select("trackingCode").lean()
    const byId = new Map((docs as any[]).map((d) => [String(d._id), d]))
    queue = requestedIds.map((id) => byId.get(id)).filter((d): d is any => Boolean(d))
  } else {
    const docs = await NavexTnParcel.find({ status: "EN_COURS" }).select("trackingCode").lean()
    queue = docs as any[]
  }

  const batch = queue.slice(0, BATCH_SIZE)
  const rest = queue.slice(BATCH_SIZE)

  const items: { code: string; ok: boolean; justPaid: boolean; label: string }[] = []
  let paid = 0

  if (batch.length > 0) {
    let multi
    try {
      multi = await getMultipleColisStatus(batch.map((p) => p.trackingCode))
    } catch (err: any) {
      for (const p of batch) items.push({ code: p.trackingCode, ok: false, justPaid: false, label: err?.message || "Erreur" })
      multi = null
    }

    if (multi) {
      const byCode = new Map(multi.results.map((r) => [r.code, r]))
      for (const p of batch) {
        const r = byCode.get(p.trackingCode)
        if (!r || r.status !== 1) {
          items.push({ code: p.trackingCode, ok: false, justPaid: false, label: r?.status_message || "Introuvable chez Navex.tn" })
          continue
        }

        const justPaid = isNavexTnPaid(r.etat)
        try {
          const set: Record<string, any> = {
            navexRawEtat: r.etat,
            navexRawMotif: r.motif || undefined,
            livreur: r.livreur || undefined,
            livreurTel: r.livreur_tel || undefined,
            lastSyncAt: new Date(),
          }
          if (justPaid) { set.status = "PAYE"; set.paidAt = new Date() }
          await NavexTnParcel.findByIdAndUpdate(p._id, { $set: set })
          if (justPaid) paid++
          items.push({ code: p.trackingCode, ok: true, justPaid, label: r.etat })
        } catch (err: any) {
          items.push({ code: p.trackingCode, ok: false, justPaid: false, label: err?.message || "Erreur" })
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { processed: batch.length, paid, items, remainingIds: rest.map((p) => String(p._id)), done: rest.length === 0 },
  })
}
