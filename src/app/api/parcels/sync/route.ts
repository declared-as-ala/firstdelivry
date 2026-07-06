import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { navexService } from "@/lib/navex/navex-client"
import { isNavexPaid } from "@/lib/navex/navex-status.mapper"

const SYNC_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE"]
// First Delivery's /etat endpoint is limited to 1 req/sec — this sync stays sequential
// and reports progress via SSE so the UI can show real-time status on large batches.
const RATE_LIMIT_MS = 1000
// Hard cap per parcel so a single hung request/DB call can never stall the whole batch —
// the carrier call already aborts at 15s internally, this is a second safety net.
const PER_PARCEL_TIMEOUT_MS = 20000

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
 * Streams one SSE event per parcel checked (see sync-bar.tsx for the consumer).
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  if (!SYNC_ROLES.includes(session.user.role as string)) return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 })

  if (!process.env.FIRST_DELIVERY_TOKEN) {
    return NextResponse.json({ success: false, error: { code: "NOT_CONFIGURED", message: "Synchronisation des paiements First Delivery indisponible." } }, { status: 503 })
  }

  await connectDB()

  const active = await Order.find({ status: "EN_COURS" }).select("navexTrackingCode").lean()
  const parcels = active.filter((p: any) => p.navexTrackingCode)

  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: Record<string, any>) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const total = parcels.length
      send(controller, { type: "start", total })

      let paid = 0
      let checked = 0
      let cancelled = false

      for (const parcel of parcels as any[]) {
        if (request.signal.aborted) { cancelled = true; break }

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
        checked++
        send(controller, { type: "progress", checked, total, paid, code: parcel.navexTrackingCode, ok, justPaid, label })

        if (checked < total && !request.signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS))
        }
      }

      send(controller, { type: "done", paid, checked, total, cancelled })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
