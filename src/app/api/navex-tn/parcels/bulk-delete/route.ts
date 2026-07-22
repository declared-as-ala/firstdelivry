import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { NavexTnParcel } from "@/lib/models/NavexTnParcel"

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"]

/** Delete multiple Navex.tn parcels (our records only — never calls Navex.tn's own
 * delete endpoint, same as the First Delivery bulk-delete). Body: { ids: string[] }. */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Non authentifié" }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403 })
  }

  await connectDB()
  const { ids } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ success: false, error: "Aucun colis sélectionné" }, { status: 400 })

  const result = await NavexTnParcel.deleteMany({ _id: { $in: ids } })
  return NextResponse.json({ success: true, deleted: result.deletedCount || 0 })
}
