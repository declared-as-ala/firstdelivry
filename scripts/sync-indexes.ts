/**
 * Drop stale indexes from the old schema and create the current ones.
 * Run once after a schema change: npm run sync-indexes
 */
import "./load-env"
import mongoose from "mongoose"
import { Order } from "../src/lib/models/Order"

async function run() {
  const uri = process.env.MONGODB_URI || ""
  if (!uri) { console.error("✗ MONGODB_URI manquant"); process.exit(1) }
  await mongoose.connect(uri)
  console.log("Index avant:", (await Order.collection.indexes()).map((i) => i.name).join(", "))
  await Order.syncIndexes()
  console.log("Index après:", (await Order.collection.indexes()).map((i) => i.name).join(", "))
  console.log("✅ Index synchronisés.")
  await mongoose.disconnect()
  process.exit(0)
}
run().catch((e) => { console.error("✗", e); process.exit(1) })
