import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { Order } from "@/lib/models/Order"

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"]

/** Delete multiple parcels. Body: { ids: string[] } or { all: true }. */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 })
  }

  await connectDB()
  const { ids, all } = await req.json().catch(() => ({}))

  let result
  if (all === true) result = await Order.deleteMany({})
  else if (Array.isArray(ids) && ids.length > 0) result = await Order.deleteMany({ _id: { $in: ids } })
  else return NextResponse.json({ success: false, error: "Aucun colis sélectionné" }, { status: 400 })

  return NextResponse.json({ success: true, deleted: result.deletedCount || 0 })
}
