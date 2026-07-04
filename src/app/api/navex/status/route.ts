import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { navexService } from "@/lib/navex/navex-client"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Non authentifié" } }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const trackingCode = searchParams.get("code")

  if (!trackingCode) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_CODE", message: "Code de suivi requis" } },
      { status: 400 }
    )
  }

  try {
    const status = await navexService.getShipmentStatus(trackingCode)
    return NextResponse.json({ success: true, data: status })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "STATUS_ERROR", message: error.message } },
      { status: 500 }
    )
  }
}
