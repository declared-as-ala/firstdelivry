import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { navexService } from "@/lib/navex/navex-client"
import { isNavexPaid } from "@/lib/navex/navex-status.mapper"

const SYNC_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE"]

/**
 * "Synchroniser les paiements Navex" — the ONLY Navex sync.
 * For each EN_COURS parcel, ask Navex; if paid → status PAYE + paidAt.
 * Never changes a parcel to Retour (returns are physical-scan only).
 */
export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  if (!SYNC_ROLES.includes(session.user.role as string)) return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 })

  if (!process.env.FIRST_DELIVERY_TOKEN) {
    return NextResponse.json({ success: false, error: { code: "NOT_CONFIGURED", message: "Synchronisation des paiements First Delivery indisponible." } }, { status: 503 })
  }

  await connectDB()

  const active = await Order.find({ status: "EN_COURS" }).select("navexTrackingCode").lean()
  if (active.length === 0) return NextResponse.json({ success: true, data: { paid: 0, checked: 0 } })

  const codes = active.map((p: any) => p.navexTrackingCode).filter(Boolean)
  let paid = 0
  try {
    const response = await navexService.getMultipleShipmentStatuses(codes)
    if (response.success && response.shipments) {
      for (const update of response.shipments) {
        const parcel = active.find((p: any) => p.navexTrackingCode === update.tracking_code)
        if (!parcel) continue
        const raw = update.status_label || update.status
        const set: Record<string, any> = { navexRawStatus: raw, lastNavexSyncAt: new Date() }
        if (isNavexPaid(raw)) { set.status = "PAYE"; set.paidAt = new Date(); paid++ }
        await Order.findByIdAndUpdate(parcel._id, { $set: set })
      }
    }
    return NextResponse.json({ success: true, data: { paid, checked: active.length } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SYNC_ERROR", message: error.message || "Erreur de synchronisation" } }, { status: 500 })
  }
}
