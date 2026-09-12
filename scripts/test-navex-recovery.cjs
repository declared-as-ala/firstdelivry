const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const ts = require("typescript")

async function main() {
  let role = "ADMIN"
  let handover = { parcelId: "original-id", createdAt: new Date("2026-09-01"), operatorId: "operator" }
  let returned = null
  let remote = { status: 1, etat: "Livrer Paye", prix: "42.5" }
  let existing = false
  let inserted
  let writes = 0
  const query = (value) => ({ sort: () => ({ lean: async () => value }) })
  const mocks = {
    "next/server": { NextResponse: { json: (data, options) => ({ data, status: options?.status || 200 }) } },
    "@/lib/auth": { auth: async () => role ? { user: { role } } : null },
    "@/lib/db": { connectDB: async () => {} },
    "@/lib/models/NavexTnParcel": { NavexTnParcel: {
      distinct: async () => ["existing"],
      exists: async () => existing,
      updateOne: async (filter, update, options) => {
        assert.deepEqual(filter, { trackingCode: "missing" })
        assert.equal(options.timestamps, false)
        assert.equal(options.upsert, true)
        inserted = update.$setOnInsert
        writes++
        return { upsertedCount: 1 }
      },
    } },
    "@/lib/models/NavexTnParcelScan": { NavexTnParcelScan: {
      distinct: async (field, filter) => {
        assert.equal(filter.mode, "HANDOVER_PREP")
        assert.equal(filter.result, "OK")
        return ["existing", "missing"]
      },
      findOne: (filter) => query(filter.mode === "HANDOVER_PREP" ? handover : returned),
    } },
    "@/lib/navex-tn/navex-tn-client": { getColisStatus: async () => remote, isNavexTnStatusConfigured: () => true },
    "@/lib/navex-tn/navex-tn-status.mapper": { isNavexTnPaid: (etat) => etat === "Livrer Paye" },
  }
  const source = fs.readFileSync("src/app/api/navex-tn/parcels/recover/route.ts", "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  vm.runInThisContext(`(function(require, module, exports) { ${compiled}\n})`)((name) => {
    assert.ok(mocks[name], `Unexpected dependency: ${name}`)
    return mocks[name]
  }, module, module.exports)
  const { GET, POST } = module.exports
  const request = { json: async () => ({ code: "missing" }) }
  assert.deepEqual((await GET()).data.codes, ["missing"])
  role = null
  assert.equal((await POST(request)).status, 401)
  role = "FINANCE"
  assert.equal((await POST(request)).status, 403)
  role = "ADMIN"
  assert.equal((await POST({ json: async () => ({ code: {} }) })).status, 400)
  assert.equal((await POST(request)).data.restored, true)
  assert.equal(inserted._id, "original-id")
  assert.equal(inserted.handedToNavexAt, handover.createdAt)
  assert.equal(inserted.codAmount, 42.5)
  assert.equal(inserted.status, "PAYE")
  assert.equal(inserted.paidAt, undefined)
  returned = { createdAt: new Date("2026-09-03"), operatorId: "return-operator" }
  await POST(request)
  assert.equal(inserted.status, "RETOUR")
  assert.equal(inserted.returnAt, returned.createdAt)
  returned = null
  remote = { status: 1, etat: "Retourné", prix: "invalid" }
  await POST(request)
  assert.equal(inserted.status, "EN_COURS")
  assert.equal(inserted.codAmount, undefined)
  existing = true
  const before = writes
  assert.equal((await POST(request)).data.restored, false)
  assert.equal(writes, before)
  existing = false
  remote = { status: 0 }
  assert.equal((await POST(request)).status, 422)
  handover = null
  assert.equal((await POST(request)).status, 404)
  assert.equal(writes, before)
  console.log("Navex recovery checks passed: authorization, candidates, dates, returns, price, missing records, and existing-parcel protection.")
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
