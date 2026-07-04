import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/User"
import { AuditLog } from "@/lib/models/AuditLog"
import { hasPermission } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Non authentifié" } }, { status: 401 })
  }

  if (!hasPermission(session.user.role as any, "users:view")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Permission refusée" } }, { status: 403 })
  }

  await connectDB()

  const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean()
  return NextResponse.json({ success: true, data: users })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Non authentifié" } }, { status: 401 })
  }

  if (!hasPermission(session.user.role as any, "users:create")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Permission refusée" } }, { status: 403 })
  }

  await connectDB()

  try {
    const body = await req.json()
    const user = await User.create(body)

    await AuditLog.create({
      userId: session.user.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user._id.toString(),
      after: { name: user.name, email: user.email, role: user.role },
    })

    return NextResponse.json({ success: true, data: { ...user.toJSON() } }, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_EMAIL", message: "Cet email est déjà utilisé" } },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: error.message } },
      { status: 400 }
    )
  }
}
