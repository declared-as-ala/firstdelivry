"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { PageHeader, EmptyState, StatusBadge, formatTND } from "@/components/parcel-ui"
import { SkeletonRows } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { useNavexSync, SyncBar, type SyncProgressEvent } from "@/components/sync-bar"
import { Button } from "@/components/ui/button"
import { Search, Trash2, RefreshCw } from "lucide-react"

interface NavexTnParcelRow {
  _id: string
  trackingCode: string
  codAmount?: number
  status: string
  navexRawEtat?: string
  livreur?: string
  handedToNavexAt?: string
  paidAt?: string
  returnAt?: string
  updatedAt: string
}

const RANGES = [
  { value: "", label: "Tout" },
  { value: "today", label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier" },
  { value: "7d", label: "7 j" },
  { value: "30d", label: "30 j" },
  { value: "custom", label: "Perso" },
]
const STATUSES = [
  { value: "", label: "Tous" },
  { value: "en_cours", label: "En cours" },
  { value: "paye", label: "Payé" },
  { value: "retour", label: "Retour" },
  { value: "a_verifier", label: "Dhay3in" },
]

function frDate(d?: string, withTime = false) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short", ...(withTime ? { timeStyle: "short" } : {}) }).format(new Date(d))
}

/** Colis Navex.tn — mirrors the First Delivery Colis page (src/app/(dashboard)/colis)
 * against the separate /api/navex-tn/* routes. No désignation/client/téléphone
 * columns here: Navex.tn's Récupération endpoint never returns those fields. */
export default function NavexColisPage() {
  const [parcels, setParcels] = useState<NavexTnParcelRow[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<Record<string, { count: number; cod: number }>>({})
  const [today, setToday] = useState<{ handedOver: { count: number; cod: number }; returned: { count: number; cod: number } }>({ handedOver: { count: 0, cod: 0 }, returned: { count: 0, cod: 0 } })
  const [delay, setDelay] = useState(3)
  const [delayInput, setDelayInput] = useState("3")
  const [isEmpty, setIsEmpty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [q, setQ] = useState("")
  const [view, setView] = useState("")
  const [range, setRange] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [day, setDay] = useState("")

  const applyDate = useCallback((p: URLSearchParams) => {
    if (day) {
      p.set("range", "custom"); p.set("from", day); p.set("to", day)
    } else if (range) {
      p.set("range", range)
      if (range === "custom") { if (from) p.set("from", from); if (to) p.set("to", to) }
    }
  }, [day, range, from, to])

  const load = useCallback(() => {
    setLoading(true)
    setSelected(new Set())
    const p = new URLSearchParams()
    if (q) p.set("q", q)
    if (view) p.set("view", view)
    applyDate(p)
    p.set("limit", "1000")
    fetch(`/api/navex-tn/parcels?${p}`).then((r) => r.json())
      .then((j) => {
        setParcels(j.data.parcels); setTotal(j.data.total); setSummary(j.data.summary || {})
        if (j.data.today) setToday(j.data.today)
        setIsEmpty(j.data.isEmpty); if (j.data.delay) { setDelay(j.data.delay); setDelayInput(String(j.data.delay)) }
      })
      .finally(() => setLoading(false))
  }, [q, view, applyDate])
  useEffect(() => { load() }, [load])

  const refreshCounts = useCallback(() => {
    const p = new URLSearchParams()
    if (q) p.set("q", q)
    if (view) p.set("view", view)
    applyDate(p)
    p.set("limit", "1")
    fetch(`/api/navex-tn/parcels?${p}`).then((r) => r.json()).then((j) => {
      if (!j?.success) return
      setTotal(j.data.total); setSummary(j.data.summary || {})
      if (j.data.today) setToday(j.data.today)
    }).catch(() => {})
  }, [q, view, applyDate])
  useEffect(() => {
    const id = setInterval(refreshCounts, 5000)
    return () => clearInterval(id)
  }, [refreshCounts])

  const [justPaidCodes, setJustPaidCodes] = useState<Set<string>>(new Set())
  const [paidCodDelta, setPaidCodDelta] = useState(0)
  const handleSyncProgress = useCallback((evt: SyncProgressEvent) => {
    if (!evt.justPaid || !evt.code) return
    const code = evt.code
    const now = new Date().toISOString()
    setParcels((prev) => prev.map((p) => p.trackingCode === code ? { ...p, status: "PAYE", paidAt: now, updatedAt: now } : p))
    setJustPaidCodes((s) => new Set(s).add(code))
    setTimeout(() => setJustPaidCodes((s) => { const n = new Set(s); n.delete(code); return n }), 2500)
    const amt = parcels.find((p) => p.trackingCode === code)?.codAmount ?? 0
    setPaidCodDelta((d) => d + amt)
  }, [parcels])
  const sync = useNavexSync({ onProgress: handleSyncProgress, onDone: load, endpoint: "/api/navex-tn/parcels/sync" })

  function startSync() {
    setPaidCodDelta(0)
    sync.start()
  }

  const liveSummary = sync.phase === "running"
    ? {
        ...summary,
        enCours: { count: Math.max(0, sync.total - sync.checked), cod: Math.max(0, (summary.enCours?.cod ?? 0) - paidCodDelta) },
        paye: { count: (summary.paye?.count ?? 0) + sync.paid, cod: (summary.paye?.cod ?? 0) + paidCodDelta },
      }
    : summary

  function toggle(id: string) { setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleAll() { setSelected((s) => s.size === parcels.length ? new Set() : new Set(parcels.map((p) => p._id))) }

  async function saveDelay() {
    const n = parseInt(delayInput, 10)
    if (!Number.isFinite(n) || n < 1) { setDelayInput(String(delay)); return }
    if (n === delay) return
    const j = await (await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verifyDelayDays: String(n) }) })).json()
    if (j.success) { toast.success(`Délai Dhay3in : ${n} jours`); setDelay(n); load() }
    else toast.error("Impossible d'enregistrer le délai")
  }

  async function removeSelected() {
    const ids = Array.from(selected)
    if (ids.length === 0 || !window.confirm(`Supprimer ${ids.length} colis sélectionné(s) ?`)) return
    const j = await (await fetch("/api/navex-tn/parcels/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) })).json()
    if (j.success) { toast.success(`${j.deleted} colis supprimés`); load() }
    else toast.error(j.error || "Suppression impossible")
  }

  return (
    <div>
      <PageHeader title="Colis Navex" subtitle={`${total} colis`}
        action={
          <div className="flex flex-wrap gap-2">
            {selected.size > 0 && (
              <button onClick={removeSelected} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
                <Trash2 className="h-4 w-4" />Supprimer ({selected.size})
              </button>
            )}
            <Button onClick={startSync} disabled={sync.phase === "running"}>
              <RefreshCw className={`h-4 w-4 mr-2 ${sync.phase === "running" ? "animate-spin" : ""}`} />
              Synchroniser les paiements Navex.tn
            </Button>
          </div>
        } />

      <SyncBar sync={sync} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { key: "enCours", view: "en_cours", label: "En cours", tone: "text-blue-600", ring: "ring-blue-200" },
          { key: "paye", view: "paye", label: "Payé", tone: "text-green-600", ring: "ring-green-200" },
          { key: "retour", view: "retour", label: "Retour", tone: "text-orange-600", ring: "ring-orange-200" },
          { key: "aVerifier", view: "a_verifier", label: "Dhay3in", tone: "text-red-600", ring: "ring-red-200" },
        ].map((c) => (
          <button key={c.key} onClick={() => setView(view === c.view ? "" : c.view)}
            className={`rounded-xl border bg-white p-4 text-left transition ${view === c.view ? `border-transparent ring-2 ${c.ring}` : "border-slate-200 hover:bg-slate-50"}`}>
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            {loading ? (
              <>
                <Skeleton className="mt-2 h-8 w-14 rounded-lg" />
                <Skeleton className="mt-2 h-3 w-16 rounded" />
              </>
            ) : (
              <>
                <p className={`mt-1 text-3xl font-bold tabular-nums ${c.tone}`}>{liveSummary[c.key]?.count ?? 0}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-400 tabular-nums">{formatTND(liveSummary[c.key]?.cod)}</p>
              </>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-indigo-700">Scannés remis à Navex.tn aujourd’hui</p>
            <p className="mt-0.5 text-xs text-indigo-400 tabular-nums">{formatTND(today.handedOver.cod)}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-indigo-700">{today.handedOver.count}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-slate-600">Scannés retour aujourd’hui</p>
            <p className="mt-0.5 text-xs text-slate-400 tabular-nums">{formatTND(today.returned.cod)}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-700">{today.returned.count}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 mb-4 text-sm">
        <span className="text-red-800">Un colis devient <b>Dhay3in</b> après</span>
        <input type="number" min={1} value={delayInput}
          onChange={(e) => setDelayInput(e.target.value)}
          onBlur={saveDelay}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
          className="h-8 w-16 rounded-lg border border-red-300 bg-white px-2 text-center font-semibold text-red-700" />
        <span className="text-red-800">jours sans être Payé ni Retour.</span>
        <span className="ml-auto text-xs text-red-500">Modifiez et appuyez sur Entrée pour enregistrer</span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="text-sm font-medium text-slate-700">📅 Filtrer par jour :</span>
          <input type="date" value={day} onChange={(e) => { setDay(e.target.value); if (e.target.value) setRange("") }}
            className={`h-9 rounded-lg border px-3 text-sm ${day ? "border-blue-600 ring-1 ring-blue-200 text-blue-700 font-medium" : "border-slate-300"}`} />
          <span className="text-xs text-slate-400">(remis, payé ou retourné ce jour)</span>
          {day
            ? <button onClick={() => setDay("")} className="ml-auto text-xs font-medium text-red-600 hover:underline">✕ Effacer le jour</button>
            : <span className="ml-auto text-xs text-slate-400">Choisissez une date pour voir les colis de ce jour</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code de suivi Navex, COD…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-sm" />
          </div>
          <select value={view} onChange={(e) => setView(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-600">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {RANGES.map((r) => (
            <button key={r.value} onClick={() => { setRange(r.value); setDay("") }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${!day && range === r.value ? "bg-blue-700 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{r.label}</button>
          ))}
        </div>
        {!day && range === "custom" && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
            <span className="text-xs font-medium text-blue-800">Du</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-blue-300 bg-white px-2 text-sm" />
            <span className="text-xs font-medium text-blue-800">au</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-blue-300 bg-white px-2 text-sm" />
            {(from || to) && <button onClick={() => { setFrom(""); setTo("") }} className="ml-auto text-xs font-medium text-red-600 hover:underline">✕ Effacer</button>}
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyState title="Aucun colis Navex.tn scanné." hint="Scannez les codes-barres Navex.tn dans le Scanner Navex pour enregistrer les colis." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" className="h-4 w-4 rounded accent-blue-700" checked={parcels.length > 0 && selected.size === parcels.length} onChange={toggleAll} /></th>
                <th className="px-3 py-2.5 font-medium">Code de suivi</th>
                <th className="px-3 py-2.5 font-medium text-right">COD</th>
                <th className="px-3 py-2.5 font-medium">Date remise</th>
                <th className="px-3 py-2.5 font-medium">État Navex</th>
                <th className="px-3 py-2.5 font-medium">Livreur</th>
                <th className="px-3 py-2.5 font-medium">Statut</th>
                <th className="px-3 py-2.5 font-medium">Date paiement</th>
                <th className="px-3 py-2.5 font-medium">Date retour</th>
                <th className="px-3 py-2.5 font-medium">Dernière MAJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <SkeletonRows rows={8} cols={10} />
              ) : parcels.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">Aucun colis pour ce filtre</td></tr>
              ) : parcels.map((p) => {
                const verifying = sync.phase === "running" && sync.current === p.trackingCode
                const justPaid = justPaidCodes.has(p.trackingCode)
                return (
                <tr key={p._id} className={`transition-colors duration-500 hover:bg-slate-50 ${
                  justPaid ? "bg-green-50" : verifying ? "bg-blue-50/70" : selected.has(p._id) ? "bg-blue-50/50" : ""
                }`}>
                  <td className="px-3 py-2.5"><input type="checkbox" className="h-4 w-4 rounded accent-blue-700" checked={selected.has(p._id)} onChange={() => toggle(p._id)} /></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      {verifying && (
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-600" />
                        </span>
                      )}
                      {p.trackingCode}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-800 tabular-nums">{formatTND(p.codAmount)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{frDate(p.handedToNavexAt, true)}</td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-[160px] truncate">{p.navexRawEtat || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[140px] truncate">{p.livreur || "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{frDate(p.paidAt)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{frDate(p.returnAt)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{frDate(p.updatedAt, true)}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
