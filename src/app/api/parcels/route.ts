import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { getVerifyDelay } from "@/lib/settings-cache"
import { statusViewFilter, dateBasisField, dateRangeFilter, verifyThreshold } from "@/lib/parcel-status"

/**
 * Colis list. Query: view (en_cours|paye|retour|a_verifier),
 * range (today|yesterday|7d|30d|custom + from,to), dateBasis (remise|paiement|retour),
 * q (Code Navex / Désignation / COD).
 * Also returns a `summary` (counts per status) for the current date+search filter.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })

  await connectDB()
  const sp = new URL(req.url).searchParams
  const delay = await getVerifyDelay()

  // base filter = date range + search (NOT the status view) → drives the summary
  const baseFilter: any = {}
  const range = sp.get("range") || undefined
  if (range) Object.assign(baseFilter, dateRangeFilter(dateBasisField(sp.get("dateBasis") || undefined), range, sp.get("from") || undefined, sp.get("to") || undefined))

  const q = sp.get("q")?.trim()
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    const or: any[] = [{ navexTrackingCode: rx }, { designation: rx }]
    const num = parseFloat(q)
    if (!isNaN(num)) or.push({ codAmount: num })
    baseFilter.$or = or
  }

  const filter = { ...baseFilter, ...statusViewFilter(sp.get("view") || "", delay) }
  const limit = Math.min(parseInt(sp.get("limit") || "300", 10), 2000)

  const [parcels, total, byStatus, avAgg, isEmptyCount] = await Promise.all([
    Order.find(filter).sort({ handedToNavexAt: -1, updatedAt: -1 }).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: baseFilter }, { $group: { _id: "$status", count: { $sum: 1 }, cod: { $sum: "$codAmount" } } }]),
    Order.aggregate([
      { $match: { ...baseFilter, status: "EN_COURS", handedToNavexAt: { $lte: verifyThreshold(delay) } } },
      { $group: { _id: null, count: { $sum: 1 }, cod: { $sum: "$codAmount" } } },
    ]),
    Order.estimatedDocumentCount(),
  ])

  const pick = (s: string) => {
    const r = (byStatus as any[]).find((x) => x._id === s)
    return { count: r?.count || 0, cod: r?.cod || 0 }
  }
  const av = (avAgg as any[])[0] || { count: 0, cod: 0 }
  const summary = {
    enCours: pick("EN_COURS"),
    paye: pick("PAYE"),
    retour: pick("RETOUR"),
    aVerifier: { count: av.count || 0, cod: av.cod || 0 },
  }

  return NextResponse.json({ success: true, data: { parcels, total, summary, delay, isEmpty: isEmptyCount === 0 } })
}
