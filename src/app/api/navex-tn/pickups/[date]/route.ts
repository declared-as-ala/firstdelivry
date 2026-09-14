import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { NavexTnParcel } from "@/lib/models/NavexTnParcel"
import { tunisDayStart } from "@/lib/tz"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ date: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  }

  const { date } = await context.params
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ success: false, error: "Format de date invalide (YYYY-MM-DD attendu)" }, { status: 400 })
  }

  await connectDB()

  try {
    const start = tunisDayStart(date)
    const end = new Date(start.getTime() + 86400000)

    const filter = {
      $or: [
        { handedToNavexAt: { $gte: start, $lt: end } },
        { handedToNavexAt: { $exists: false }, createdAt: { $gte: start, $lt: end } },
      ],
    }

    const orders = await NavexTnParcel.find(filter)
      .sort({ handedToNavexAt: 1, createdAt: 1 })
      .lean()

    const parcels = orders.map((p) => ({
      _id: String(p._id),
      trackingCode: p.trackingCode,
      codAmount: p.codAmount || 0,
      designation: p.navexRawEtat ? `État: ${p.navexRawEtat}` : "",
      clientName: p.livreur ? `Livreur: ${p.livreur}` : "",
      clientPhone: p.livreurTel || "",
      status: p.status,
      handedToNavexAt: p.handedToNavexAt ? p.handedToNavexAt.toISOString() : undefined,
    }))

    const totalCod = parcels.reduce((sum, p) => sum + p.codAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        date,
        count: parcels.length,
        totalCod,
        parcels,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erreur lors de la récupération des colis du jour" },
      { status: 500 }
    )
  }
}
