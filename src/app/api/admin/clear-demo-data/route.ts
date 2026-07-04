import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"
import { ParcelScan } from "@/lib/models/ParcelScan"
import { NavexApiLog } from "@/lib/models/NavexApiLog"
import { AuditLog } from "@/lib/models/AuditLog"

const DEMO_MODELS = [
  { model: Order, label: "Colis" },
  { model: ParcelScan, label: "Scans" },
  { model: NavexApiLog, label: "Logs API" },
  { model: AuditLog, label: "Audit" },
]

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  }

  const role = session.user.role as string
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 })
  }

  await connectDB()

  const results: Record<string, number> = {}

  for (const { model, label } of DEMO_MODELS) {
    try {
      const deleted = await model.deleteMany({ isDemo: true })
      results[label] = deleted.deletedCount || 0
    } catch (err: any) {
      results[label] = -1
    }
  }

  const total = Object.values(results).reduce((sum, c) => sum + (c > 0 ? c : 0), 0)

  await AuditLog.create({
    userId: session.user.id,
    action: "CLEAR_DEMO_DATA",
    entityType: "SYSTEM",
    after: { results, total },
    isDemo: false,
  })

  return NextResponse.json({ success: true, data: { results, totalDeleted: total } })
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  }

  await connectDB()

  const counts: Record<string, number> = {}

  for (const { model, label } of DEMO_MODELS) {
    try {
      counts[label] = await model.countDocuments({ isDemo: true })
    } catch {
      counts[label] = -1
    }
  }

  return NextResponse.json({ success: true, data: counts })
}
