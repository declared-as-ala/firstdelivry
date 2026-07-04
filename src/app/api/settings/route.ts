import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { SystemSetting } from "@/lib/models/SystemSetting"

export async function GET() {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Non authentifié" } }, { status: 401 })
  }

  await connectDB()

  const settings = await SystemSetting.find({}).lean()
  const data: Record<string, any> = {}

  for (const s of settings) {
    data[s.key] = s.value
  }

  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Non authentifié" } }, { status: 401 })
  }

  await connectDB()

  const body = await req.json()

  for (const [key, value] of Object.entries(body)) {
    await SystemSetting.findOneAndUpdate(
      { key },
      { key, value, group: getSettingGroup(key) },
      { upsert: true }
    )
  }

  return NextResponse.json({ success: true })
}

function getSettingGroup(key: string): string {
  if (key.startsWith("sender")) return "sender"
  if (key.startsWith("navex")) return "navex"
  if (key.startsWith("company")) return "company"
  return "general"
}
