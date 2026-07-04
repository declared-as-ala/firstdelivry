/**
 * Production-safe seed.
 *
 * Creates ONLY the login accounts the warehouse needs. It does NOT create any
 * parcels, products, scans or demo orders — LogiFlow starts with a clean,
 * empty database and parcels arrive exclusively through the Navex import.
 *
 * Run: npm run seed
 */
import "./load-env"
import mongoose from "mongoose"
import { User } from "../src/lib/models/User"

const MONGODB_URI = process.env.MONGODB_URI || ""
if (!MONGODB_URI) { console.error("✗ MONGODB_URI manquant (.env.local ou variable d'environnement)"); process.exit(1) }

const USERS = [
  { name: "Super Admin", email: "admin@mzali.tn", password: "admin123", role: "SUPER_ADMIN" as const },
  { name: "Opérateur Entrepôt", email: "operateur@logiflow.tn", password: "operateur123", role: "WAREHOUSE_OPERATOR" as const },
  { name: "Finance", email: "finance@logiflow.tn", password: "finance123", role: "FINANCE" as const },
]

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log("✓ Connecté à MongoDB")

  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email })
    if (existing) {
      console.log(`• ${u.email} existe déjà — ignoré`)
      continue
    }
    await User.create({ ...u, active: true })
    console.log(`✓ Utilisateur créé: ${u.email} (${u.role})`)
  }

  console.log("\n✅ Seed terminé. Aucune donnée de démonstration créée.")
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error("✗ Erreur de seed:", err)
  process.exit(1)
})
