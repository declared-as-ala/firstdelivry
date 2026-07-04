/**
 * End-to-end test of the 500-parcel anti-loss scenario.
 * Runs against an ISOLATED database (logiflow_test). Uses the real scan engine.
 *
 * Run: npm run test:scenario
 */
import "./load-env"
import mongoose from "mongoose"
import { Order } from "../src/lib/models/Order"
import { decideRemiseExisting, decideReturnReceive } from "../src/lib/scan-engine"
import { verifyThreshold } from "../src/lib/parcel-status"

const BASE_URI = process.env.MONGODB_URI || ""
if (!BASE_URI) { console.error("✗ MONGODB_URI manquant"); process.exit(1) }
const TEST_URI = BASE_URI.replace(/\/([^/?]+)(\?|$)/, "/firstdelivry_test$2")

let passed = 0, failed = 0
function assert(label: string, actual: any, expected: any) {
  const ok = actual === expected
  ok ? passed++ : failed++
  console.log(`${ok ? "✅" : "❌"} ${label}: ${actual}${ok ? "" : ` (attendu ${expected})`}`)
}

const DELAY = 3
async function count(f: any) { return Order.countDocuments(f) }
async function aVerifier() { return Order.countDocuments({ status: "EN_COURS", handedToNavexAt: { $lte: verifyThreshold(DELAY) } }) }

async function main() {
  await mongoose.connect(TEST_URI)
  console.log("✓ Base de test isolée (logiflow_test)\n")
  try { await Order.collection.drop() } catch { /* not exist */ }
  await Order.syncIndexes()

  // Day 1: scan 500 (fresh)
  const now = new Date()
  await Order.insertMany(Array.from({ length: 500 }, (_, i) => ({
    navexTrackingCode: `${450000000000 + i + 1}`,
    codAmount: 15 + (i % 60),
    designation: "1x article",
    status: "EN_COURS" as const,
    handedToNavexAt: now,
  })))
  console.log("— Jour 1 : 500 colis remis à Navex —")
  assert("Total scannés", await count({}), 500)
  assert("En cours", await count({ status: "EN_COURS" }), 500)
  assert("À vérifier (dans le délai)", await aVerifier(), 0)

  // Simulate the delay passing (parcels now older than 3 days)
  await Order.updateMany({}, { handedToNavexAt: new Date(Date.now() - 5 * 86400000) })

  // Payment sync: 400 paid
  const all = await Order.find({}).select("_id").lean()
  await Order.updateMany({ _id: { $in: all.slice(0, 400).map((p) => p._id) } }, { status: "PAYE", paidAt: new Date() })
  console.log("\n— Sync paiements : 400 payés —")
  assert("Payé", await count({ status: "PAYE" }), 400)
  assert("En cours", await count({ status: "EN_COURS" }), 100)

  // Physical returns: 60
  const enCours = await Order.find({ status: "EN_COURS" }).limit(60)
  for (const p of enCours) {
    const dec = decideReturnReceive(p)
    if (dec.ok) { dec.mutate?.(p as any); await p.save() }
  }
  console.log("\n— 60 retours scannés physiquement —")
  assert("Payé", await count({ status: "PAYE" }), 400)
  assert("Retour", await count({ status: "RETOUR" }), 60)
  assert("En cours", await count({ status: "EN_COURS" }), 40)
  assert("Colis à vérifier", await aVerifier(), 40)

  // Validations
  console.log("\n— Validations —")
  const one = await Order.findOne({ status: "EN_COURS" })
  assert("Re-scan remise bloqué", decideRemiseExisting(one as any).ok, false)
  const ret = await Order.findOne({ status: "RETOUR" })
  assert("Re-scan retour bloqué", decideReturnReceive(ret as any).ok, false)
  const paid = await Order.findOne({ status: "PAYE" })
  assert("Payé → Retour bloqué", decideReturnReceive(paid as any).ok, false)

  console.log(`\n========================================`)
  console.log(`RÉSULTAT : ${passed} réussis, ${failed} échoués`)
  console.log(`========================================`)

  await Order.deleteMany({})
  await mongoose.disconnect()
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error("✗", e); process.exit(1) })
