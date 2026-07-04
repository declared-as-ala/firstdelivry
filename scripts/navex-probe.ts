/**
 * Probe the real Navex status/etat API for one or more tracking codes.
 * Shows the raw JSON Navex returns + how LogiFlow would map it.
 *
 * Usage:  npx tsx scripts/navex-probe.ts 451284295362 387929459850
 */
import "./load-env"
import { mapToSimpleNavexStatus, isNavexPaid } from "../src/lib/navex/navex-status.mapper"

const token = process.env.FIRST_DELIVERY_TOKEN || ""
const BASE = process.env.FIRST_DELIVERY_API_BASE || "https://www.firstdeliverygroup.com/api/v2"

async function probe(code: string) {
  console.log(`\n========== ${code} ==========`)
  if (!token) { console.log("✗ Aucun FIRST_DELIVERY_TOKEN configuré"); return }

  const url = `${BASE}/etat`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ barCode: code }),
    })
    const text = await res.text()
    console.log("HTTP:", res.status)
    let json: any
    try { json = JSON.parse(text) } catch { console.log("RAW (non-JSON):", text.slice(0, 500)); return }
    console.log("RAW JSON:", JSON.stringify(json, null, 2))
    const resData = json.result || json
    const raw = resData.state !== undefined ? String(resData.state) : ""
    console.log("→ Statut First Delivery:", mapToSimpleNavexStatus(raw), "| Payé:", isNavexPaid(raw), "| COD:", resData.Produit?.prix ?? "—")
  } catch (e: any) {
    console.log("✗ Erreur:", e.message)
  }
}

async function main() {
  const codes = process.argv.slice(2)
  if (codes.length === 0) { console.log("Usage: npx tsx scripts/navex-probe.ts <code> [code2 ...]"); process.exit(1) }
  console.log(`Token: ${token ? token.slice(0, 12) + "…" : "(aucun)"}`)
  for (const c of codes) await probe(c)
  process.exit(0)
}
main()
