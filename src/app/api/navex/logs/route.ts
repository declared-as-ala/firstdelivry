import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { NavexApiLog } from "@/lib/models/NavexApiLog"

export async function GET() {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Non authentifié" } }, { status: 401 })
  }

  await connectDB()

  const demoFilter = process.env.ENABLE_DEMO_DATA === "true" ? {} : { isDemo: { $ne: true } }

  const logs = await NavexApiLog.find(demoFilter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()

  return NextResponse.json({ success: true, data: logs })
}
