import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { getVerifyDelay } from "@/lib/settings-cache"
import { verifyThreshold } from "@/lib/parcel-status"

/**
 * "Colis à vérifier" — EN_COURS parcels handed over more than `delay` days ago
 * (not paid, not returned). The core anti-loss list.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })

  await connectDB()
  const delay = await getVerifyDelay()
  const filter = { status: "EN_COURS", handedToNavexAt: { $lte: verifyThreshold(delay) } }

  const parcels = await Order.find(filter)
    .select("navexTrackingCode codAmount designation handedToNavexAt")
    .sort({ handedToNavexAt: 1 }) // longest waiting first
    .limit(5000)
    .lean()

  const totalCod = parcels.reduce((s, p: any) => s + (p.codAmount || 0), 0)

  return NextResponse.json({ success: true, data: { delay, count: parcels.length, totalCod, parcels } })
}
