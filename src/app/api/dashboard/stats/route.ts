import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { ParcelScan } from "@/lib/models/ParcelScan"
import { getVerifyDelay } from "@/lib/settings-cache"
import { dateRangeFilter, verifyThreshold } from "@/lib/parcel-status"
import { tunisStartOfDay } from "@/lib/tz"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })

  await connectDB()
  const sp = new URL(req.url).searchParams
  const delay = await getVerifyDelay()
  const threshold = verifyThreshold(delay)

  const dateFilter = dateRangeFilter("handedToNavexAt", sp.get("range") || undefined, sp.get("from") || undefined, sp.get("to") || undefined)
  const base = { ...dateFilter }
  const c = (extra: any) => Order.countDocuments({ ...base, ...extra })

  const [scannedToday, enCours, paye, retour, aVerifier, scannedTotal, activity] = await Promise.all([
    ParcelScan.countDocuments({ result: "OK", mode: "HANDOVER_PREP", createdAt: { $gte: tunisStartOfDay() } }),
    c({ status: "EN_COURS" }),
    c({ status: "PAYE" }),
    c({ status: "RETOUR" }),
    c({ status: "EN_COURS", handedToNavexAt: { $lte: threshold } }),
    c({}),
    Order.aggregate([
      { $match: { ...base, handedToNavexAt: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: "%d/%m", date: "$handedToNavexAt", timezone: "Africa/Tunis" } },
          sortKey: { $min: { $dateToString: { format: "%Y-%m-%d", date: "$handedToNavexAt", timezone: "Africa/Tunis" } } },
          scannes: { $sum: 1 },
          payes: { $sum: { $cond: [{ $eq: ["$status", "PAYE"] }, 1, 0] } },
          retours: { $sum: { $cond: [{ $eq: ["$status", "RETOUR"] }, 1, 0] } },
          averifier: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "EN_COURS"] }, { $lte: ["$handedToNavexAt", threshold] }] }, 1, 0] } },
        },
      },
      { $sort: { sortKey: 1 } },
      { $limit: 31 },
    ]),
  ])

  const activityByDay = (activity as any[]).map((a) => ({ day: a._id, scannes: a.scannes, payes: a.payes, retours: a.retours, averifier: a.averifier }))

  // Aging of "à vérifier" parcels: how long they've been stuck (older = likely lost)
  const agingAgg = await Order.aggregate([
    { $match: { ...base, status: "EN_COURS", handedToNavexAt: { $lte: threshold } } },
    { $addFields: { d: { $dateDiff: { startDate: "$handedToNavexAt", endDate: "$$NOW", unit: "day" } } } },
    { $bucket: { groupBy: "$d", boundaries: [0, 7, 14, 30, 100000], default: -1, output: { count: { $sum: 1 }, cod: { $sum: "$codAmount" } } } },
  ])
  const AGING = [
    { id: 0, label: `${delay}–6 j`, color: "#f59e0b" },
    { id: 7, label: "1–2 sem.", color: "#ea580c" },
    { id: 14, label: "2–4 sem.", color: "#dc2626" },
    { id: 30, label: "+ 1 mois", color: "#991b1b" },
  ]
  const agingBuckets = AGING.map((b) => {
    const row = (agingAgg as any[]).find((a) => a._id === b.id)
    return { name: b.label, value: row?.count || 0, cod: row?.cod || 0, color: b.color }
  })
  const atRiskCod = agingBuckets.reduce((s, b) => s + b.cod, 0)

  return NextResponse.json({
    success: true,
    data: {
      cards: { scannedToday, enCours, paye, retour, aVerifier },
      activityByDay,
      agingBuckets,
      atRiskCod,
      reconciliation: [
        { name: "Scannés", value: scannedTotal, color: "#2563eb" },
        { name: "Payé", value: paye, color: "#16a34a" },
        { name: "Retour", value: retour, color: "#ea580c" },
        { name: "À vérifier", value: aVerifier, color: "#dc2626" },
      ],
      isEmpty: (await Order.countDocuments({})) === 0,
    },
  })
}
