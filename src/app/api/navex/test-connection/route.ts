import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { navexService } from "@/lib/navex/navex-client"

export async function POST() {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Non authentifié" } }, { status: 401 })
  }

  try {
    const result = await navexService.testConnection()
    return NextResponse.json({ success: result.success, data: { message: result.message } })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: "CONNECTION_ERROR", message: error.message || "Erreur de connexion" },
    })
  }
}
