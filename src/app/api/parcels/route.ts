import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { getVerifyDelay } from "@/lib/settings-cache"
import { statusViewFilter, activityDateFilter, verifyThreshold } from "@/lib/parcel-status"
import { tunisStartOfDay } from "@/lib/tz"

/**
 * Colis list. Query: view (en_cours|paye|retour|a_verifier),
 * range (today|yesterday|7d|30d|custom + from,to),
 * q (Code Navex / Désignation / Client / Téléphone / COD).
 * A date range matches any parcel with activity in it — handed over, paid, or
 * returned — there's no separate date-basis picker to choose between.
 * Also returns a `summary` (counts per status, respects the current filter) and a
 * `today` tally (handed-over / returned counts for the real Africa/Tunis calendar
 * day, always — independent of whatever filter is applied on the page).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })

  await connectDB()
  const sp = new URL(req.url).searchParams
  const delay = await getVerifyDelay()

  // base filter = date range + search (NOT the status view) → drives the summary
  const clauses: any[] = []
  const range = sp.get("range") || undefined
  if (range) {
    const dateClause = activityDateFilter(range, sp.get("from") || undefined, sp.get("to") || undefined)
    if (Object.keys(dateClause).length > 0) clauses.push(dateClause)
  }

  const q = sp.get("q")?.trim()
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    const or: any[] = [{ navexTrackingCode: rx }, { designation: rx }, { clientName: rx }, { clientPhone: rx }]
    const num = parseFloat(q)
    if (!isNaN(num)) or.push({ codAmount: num })
    clauses.push({ $or: or })
  }

  const baseFilter: any = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses }

  const filter = { ...baseFilter, ...statusViewFilter(sp.get("view") || "", delay) }
  const limit = Math.min(parseInt(sp.get("limit") || "300", 10), 2000)
  const todayStart = tunisStartOfDay()

  const [parcels, total, byStatus, avAgg, isEmptyCount, todayHandedAgg, todayReturnAgg] = await Promise.all([
    Order.find(filter).sort({ handedToNavexAt: -1, updatedAt: -1 }).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: baseFilter }, { $group: { _id: "$status", count: { $sum: 1 }, cod: { $sum: "$codAmount" } } }]),
    Order.aggregate([
      { $match: { ...baseFilter, status: "EN_COURS", handedToNavexAt: { $lte: verifyThreshold(delay) } } },
      { $group: { _id: null, count: { $sum: 1 }, cod: { $sum: "$codAmount" } } },
    ]),
    Order.estimatedDocumentCount(),
    // "Today" tallies always reflect the real calendar day (Africa/Tunis), regardless
    // of whatever date/view filter is currently applied on the page.
    Order.aggregate([
      { $match: { handedToNavexAt: { $gte: todayStart } } },
      { $group: { _id: null, count: { $sum: 1 }, cod: { $sum: "$codAmount" } } },
    ]),
    Order.aggregate([
      { $match: { returnAt: { $gte: todayStart } } },
      { $group: { _id: null, count: { $sum: 1 }, cod: { $sum: "$codAmount" } } },
    ]),
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
  const todayHanded = (todayHandedAgg as any[])[0] || { count: 0, cod: 0 }
  const todayReturn = (todayReturnAgg as any[])[0] || { count: 0, cod: 0 }
  const today = {
    handedOver: { count: todayHanded.count || 0, cod: todayHanded.cod || 0 },
    returned: { count: todayReturn.count || 0, cod: todayReturn.cod || 0 },
  }

  return NextResponse.json({ success: true, data: { parcels, total, summary, today, delay, isEmpty: isEmptyCount === 0 } })
}
