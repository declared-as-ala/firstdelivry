import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { navexService } from "@/lib/navex/navex-client"
import { isNavexPaid } from "@/lib/navex/navex-status.mapper"

const SYNC_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE"]
// First Delivery's /etat endpoint is limited to 1 req/sec.
const RATE_LIMIT_MS = 1000
// Hard cap per parcel so a single hung request/DB call can never stall the batch —
// the carrier call already aborts at 15s internally, this is a second safety net.
const PER_PARCEL_TIMEOUT_MS = 20000
// Process a small batch per call instead of streaming the whole thing over one
// long-lived connection — a batch finishes in a few seconds, well under any
// reverse proxy/CDN's idle or max-duration limit that would otherwise silently
// kill a long SSE connection with no error on either side (see sync-bar.tsx).
const BATCH_SIZE = 5

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Délai dépassé")), ms)),
  ])
}

/**
 * "Synchroniser les paiements Navex" — the ONLY Navex sync.
 * For each EN_COURS parcel, ask Navex; if paid → status PAYE + paidAt.
 * Never changes a parcel to Retour (returns are physical-scan only).
 *
 * The client (sync-bar.tsx) drives this as a fixed-size queue, not a fresh
 * re-query every call: the first call (no `ids` in the body) takes a snapshot
 * of every parcel currently EN_COURS and returns `remainingIds` for the rest;
 * every following call passes those `ids` back so the total to process never
 * moves. Any parcel scanned in *after* the snapshot is simply left for the
 * next sync run instead of inflating the count of the run already in progress.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  if (!SYNC_ROLES.includes(session.user.role as string)) return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 })

  if (!process.env.FIRST_DELIVERY_TOKEN) {
    return NextResponse.json({ success: false, error: { code: "NOT_CONFIGURED", message: "Synchronisation des paiements First Delivery indisponible." } }, { status: 503 })
  }

  await connectDB()

  const body = await request.json().catch(() => null)
  const requestedIds: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined

  let queue: { _id: any; navexTrackingCode: string }[]
  if (requestedIds) {
    // Resume an existing snapshot: only re-fetch these exact parcels, and drop any
    // that left EN_COURS in the meantime (e.g. a manual edit) — never add new ones.
    const docs = await Order.find({ _id: { $in: requestedIds }, status: "EN_COURS" }).select("navexTrackingCode").lean()
    const byId = new Map((docs as any[]).map((d) => [String(d._id), d]))
    queue = requestedIds.map((id) => byId.get(id)).filter((d): d is any => Boolean(d) && Boolean(d.navexTrackingCode))
  } else {
    // Fresh start: snapshot every parcel currently EN_COURS.
    const docs = await Order.find({ status: "EN_COURS" }).select("navexTrackingCode").lean()
    queue = (docs as any[]).filter((d) => d.navexTrackingCode)
  }

  const batch = queue.slice(0, BATCH_SIZE)
  const rest = queue.slice(BATCH_SIZE)

  const items: { code: string; ok: boolean; justPaid: boolean; label: string }[] = []
  let paid = 0

  for (let i = 0; i < batch.length; i++) {
    const parcel = batch[i]
    let justPaid = false
    let ok = false
    let label = "Erreur"

    try {
      const result = await withTimeout(navexService.getShipmentStatus(parcel.navexTrackingCode), PER_PARCEL_TIMEOUT_MS)
      const raw = String(result.status_label || result.status || "")
      ok = result.success
      label = result.success ? raw : (result.error || "Erreur")
      if (result.success) {
        const set: Record<string, any> = { navexRawStatus: raw, lastNavexSyncAt: new Date() }
        if (isNavexPaid(raw)) { set.status = "PAYE"; set.paidAt = new Date(); justPaid = true }
        await withTimeout(Order.findByIdAndUpdate(parcel._id, { $set: set }), PER_PARCEL_TIMEOUT_MS)
      }
    } catch (err: any) {
      ok = false
      label = err?.message || "Erreur"
    }

    if (justPaid) paid++
    items.push({ code: parcel.navexTrackingCode, ok, justPaid, label })

    if (i < batch.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS))
    }
  }

  return NextResponse.json({
    success: true,
    data: { processed: batch.length, paid, items, remainingIds: rest.map((p) => String(p._id)), done: rest.length === 0 },
  })
}
