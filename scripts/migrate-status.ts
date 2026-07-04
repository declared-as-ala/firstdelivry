/**
 * Backfill the `status` field for parcels created under the old schema.
 *   returnAt present  → RETOUR
 *   paidAt present     → PAYE
 *   otherwise          → EN_COURS
 * Run once: npx tsx scripts/migrate-status.ts
 */
import "./load-env"
import mongoose from "mongoose"
import { Order } from "../src/lib/models/Order"

async function run() {
  const uri = process.env.MONGODB_URI || ""
  if (!uri) { console.error("✗ MONGODB_URI manquant"); process.exit(1) }
  await mongoose.connect(uri)
  const col = Order.collection

  const r1 = await col.updateMany({ status: { $in: [null, ""] }, returnAt: { $ne: null } }, { $set: { status: "RETOUR" } })
  const r2 = await col.updateMany({ status: { $in: [null, ""] }, paidAt: { $ne: null } }, { $set: { status: "PAYE" } })
  const r3 = await col.updateMany({ status: { $in: [null, ""] } }, { $set: { status: "EN_COURS" } })

  // Ensure a handedToNavexAt exists (old parcels used other date fields)
  await col.updateMany({ handedToNavexAt: { $in: [null, undefined] } }, [{ $set: { handedToNavexAt: "$createdAt" } }])

  console.log(`RETOUR: ${r1.modifiedCount} · PAYE: ${r2.modifiedCount} · EN_COURS: ${r3.modifiedCount}`)
  const counts = await Promise.all(["EN_COURS", "PAYE", "RETOUR"].map((s) => col.countDocuments({ status: s })))
  console.log(`Total → En cours: ${counts[0]} · Payé: ${counts[1]} · Retour: ${counts[2]}`)
  console.log("✅ Migration terminée.")
  await mongoose.disconnect()
  process.exit(0)
}
run().catch((e) => { console.error("✗", e); process.exit(1) })
