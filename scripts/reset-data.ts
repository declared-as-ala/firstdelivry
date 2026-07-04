/**
 * Safe production data reset.
 *
 * Deletes ALL operational data (parcels, batches, scans, recettes, imports,
 * logs) but KEEPS user accounts and system settings. Use this to remove any old
 * seed / demo records before going live.
 *
 * Run: npm run reset          (asks nothing — deletes operational data)
 *      npm run reset -- --demo-only   (deletes only records flagged isDemo)
 */
import "./load-env"
import mongoose from "mongoose"
import { Order } from "../src/lib/models/Order"
import { ParcelScan } from "../src/lib/models/ParcelScan"
import { NavexApiLog } from "../src/lib/models/NavexApiLog"
import { AuditLog } from "../src/lib/models/AuditLog"

const MONGODB_URI = process.env.MONGODB_URI || ""
if (!MONGODB_URI) { console.error("✗ MONGODB_URI manquant (.env.local ou variable d'environnement)"); process.exit(1) }

const demoOnly = process.argv.includes("--demo-only")
const filter = demoOnly ? { isDemo: true } : {}

const MODELS = [
  { model: Order, label: "Colis" },
  { model: ParcelScan, label: "Scans" },
  { model: NavexApiLog, label: "Logs API Navex" },
  { model: AuditLog, label: "Audit" },
]

async function reset() {
  await mongoose.connect(MONGODB_URI)
  console.log(`✓ Connecté à MongoDB ${demoOnly ? "(démo uniquement)" : "(toutes les données opérationnelles)"}\n`)

  let total = 0
  for (const { model, label } of MODELS) {
    const res = await (model as any).deleteMany(filter)
    total += res.deletedCount || 0
    console.log(`• ${label}: ${res.deletedCount || 0} supprimé(s)`)
  }

  console.log(`\n✅ Réinitialisation terminée. ${total} document(s) supprimé(s). Utilisateurs et paramètres conservés.`)
  await mongoose.disconnect()
  process.exit(0)
}

reset().catch((err) => {
  console.error("✗ Erreur:", err)
  process.exit(1)
})
