import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { NavexTnParcel } from "@/lib/models/NavexTnParcel"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  }

  await connectDB()

  try {
    const pickups = await NavexTnParcel.aggregate([
      {
        $match: {
          $or: [
            { handedToNavexAt: { $exists: true, $ne: null } },
            { createdAt: { $exists: true } },
          ],
        },
      },
      {
        $project: {
          dateStr: {
            $dateToString: {
              date: { $ifNull: ["$handedToNavexAt", "$createdAt"] },
              timezone: "Africa/Tunis",
              format: "%Y-%m-%d",
            },
          },
          codAmount: "$codAmount",
          status: "$status",
        },
      },
      {
        $group: {
          _id: "$dateStr",
          count: { $sum: 1 },
          totalCod: { $sum: "$codAmount" },
          enCoursCount: {
            $sum: { $cond: [{ $eq: ["$status", "EN_COURS"] }, 1, 0] },
          },
          payeCount: {
            $sum: { $cond: [{ $eq: ["$status", "PAYE"] }, 1, 0] },
          },
          retourCount: {
            $sum: { $cond: [{ $eq: ["$status", "RETOUR"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 90 },
    ])

    const formatted = pickups.map((p) => ({
      date: p._id,
      count: p.count,
      totalCod: p.totalCod || 0,
      enCoursCount: p.enCoursCount || 0,
      payeCount: p.payeCount || 0,
      retourCount: p.retourCount || 0,
    }))

    return NextResponse.json({ success: true, data: formatted })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erreur lors de la récupération des pickups Navex.tn" },
      { status: 500 }
    )
  }
}
