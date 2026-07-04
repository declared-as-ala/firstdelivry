import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { navexService } from "@/lib/navex/navex-client"
import { isNavexPaid } from "@/lib/navex/navex-status.mapper"

/** Scheduled payment sync (cron). Same rules as POST /api/parcels/sync. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }
  if (!process.env.NAVEX_STATUS_TOKEN) {
    return NextResponse.json({ success: false, error: "Paiements Navex non configurés" }, { status: 503 })
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
    return NextResponse.json({ success: false, error: { code: "CRON_SYNC_ERROR", message: error.message } })
  }
}
