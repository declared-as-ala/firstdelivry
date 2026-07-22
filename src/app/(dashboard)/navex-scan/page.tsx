"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { PageHeader, formatTND, StatusBadge } from "@/components/parcel-ui"
import { CheckCircle2, XCircle, PackageCheck, CornerUpLeft, Search } from "lucide-react"

type Mode = "HANDOVER_PREP" | "RETURN_RECEIVE" | "VERIFY"

const MODES: { value: Mode; label: string; icon: any }[] = [
  { value: "HANDOVER_PREP", label: "Remise à Navex.tn", icon: PackageCheck },
  { value: "RETURN_RECEIVE", label: "Retour reçu", icon: CornerUpLeft },
  { value: "VERIFY", label: "Vérifier un colis", icon: Search },
]

interface ScanRow { ok: boolean; message: string; code: string; parcel?: any; ts: number }

function beep(ok: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = ok ? 880 : 220
    o.type = ok ? "sine" : "square"
    g.gain.value = 0.1; o.start()
    setTimeout(() => { o.stop(); ctx.close() }, ok ? 110 : 240)
  } catch { /* no audio */ }
}
function frDate(d?: string, withTime = false) {
  return d ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short", ...(withTime ? { timeStyle: "short" } : {}) }).format(new Date(d)) : "—"
}
function daysSince(d?: string) {
  return d ? `${Math.floor((Date.now() - new Date(d).getTime()) / 86400000)} j` : "—"
}

/** Scanner Navex.tn — mirrors the First Delivery Scanner (src/app/(dashboard)/scan)
 * against /api/navex-tn/scans. No client/phone/désignation fields: Navex.tn's
 * Récupération endpoint never returns them, so there's nothing to show here. */
export default function NavexScannerPage() {
  const [mode, setMode] = useState<Mode>("HANDOVER_PREP")
  const [code, setCode] = useState("")
  const [last, setLast] = useState<ScanRow | null>(null)
  const [history, setHistory] = useState<ScanRow[]>([])
  const [busy, setBusy] = useState(false)
  const [queued, setQueued] = useState(0)
  // Cumulative for the whole session — NOT derived from `history` (capped to 25
  // rows for display), which made the counter look "stuck" past ~25 scans.
  const [okTotal, setOkTotal] = useState(0)
  const [failTotal, setFailTotal] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // Same queueing fix as the First Delivery scanner: never silently drop a scan that
  // arrives while a previous one is still in flight.
  const queueRef = useRef<{ code: string; mode: Mode }[]>([])
  const processingRef = useRef(false)

  const focusInput = useCallback(() => inputRef.current?.focus(), [])
  useEffect(() => { focusInput() }, [mode, focusInput])
  useEffect(() => { const i = setInterval(focusInput, 1500); return () => clearInterval(i) }, [focusInput])

  async function processQueue() {
    if (processingRef.current) return
    processingRef.current = true
    setBusy(true)
    while (queueRef.current.length > 0) {
      const { code: t, mode: scanMode } = queueRef.current.shift()!
      setQueued(queueRef.current.length)
      try {
        const res = await fetch("/api/navex-tn/scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackingCode: t, mode: scanMode }) })
        const j = await res.json()
        const row: ScanRow = { ok: !!j.success, message: j.success ? "OK" : j.error?.message || "Erreur", code: j.parcel?.trackingCode || t, parcel: j.parcel, ts: Date.now() }
        setLast(row)
        setHistory((h) => [row, ...h].slice(0, 25))
        j.success ? setOkTotal((n) => n + 1) : setFailTotal((n) => n + 1)
        beep(j.success)
      } catch {
        const row: ScanRow = { ok: false, message: "Erreur réseau", code: t, ts: Date.now() }
        setLast(row)
        setHistory((h) => [row, ...h].slice(0, 25))
        setFailTotal((n) => n + 1)
        beep(false)
      }
    }
    processingRef.current = false
    setBusy(false)
  }

  function enqueue(trackingCode: string) {
    const t = trackingCode.trim().replace(/[\r\n]+$/g, "").trim()
    if (!t) return
    queueRef.current.push({ code: t, mode })
    setQueued(queueRef.current.length)
    processQueue()
  }

  function submit(trackingCode: string) {
    enqueue(trackingCode)
    setCode("")
    focusInput()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) { if (e.key === "Enter") { e.preventDefault(); submit(code) } }

  const successTitle = mode === "RETURN_RECEIVE" ? "Retour enregistré" : mode === "VERIFY" ? "Colis trouvé" : "Colis remis à Navex.tn"

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Scanner Navex" subtitle="Poste de scan entrepôt — Navex.tn" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
        {MODES.map((m) => {
          const Icon = m.icon; const active = mode === m.value
          return (
            <button key={m.value} onClick={() => { setMode(m.value); setLast(null) }}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              <Icon className={`h-5 w-5 ${active ? "text-blue-600" : "text-slate-400"}`} />
              <span className="text-sm font-medium">{m.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <input ref={inputRef} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onKeyDown} onBlur={focusInput} autoFocus
            placeholder="Scannez le code-barres Navex.tn…"
            className="scan-input w-full h-20 rounded-2xl border-2 border-slate-300 bg-white px-6 text-3xl font-mono tracking-wider text-slate-900 focus:border-blue-600" />
          {(busy || queued > 0) && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Traitement en cours{queued > 0 ? ` — ${queued} scan${queued > 1 ? "s" : ""} en attente` : "…"}
            </p>
          )}

          {last && (
            <div className={`rounded-2xl border-2 p-6 ${last.ok ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
              <div className="flex items-center gap-3">
                {last.ok ? <CheckCircle2 className="h-10 w-10 text-green-600" /> : <XCircle className="h-10 w-10 text-red-600" />}
                <div>
                  <p className={`text-xl font-bold ${last.ok ? "text-green-800" : "text-red-800"}`}>{last.ok ? successTitle : last.message}</p>
                  <p className="text-sm font-mono text-slate-500">{last.code}</p>
                </div>
              </div>

              {last.parcel && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm border-t border-slate-200/60 pt-4">
                  <Info label="COD" value={formatTND(last.parcel.codAmount)} />
                  <Info label="État Navex" value={last.parcel.navexRawEtat} />
                  <Info label="Livreur" value={last.parcel.livreur} />
                  <Info label="Date remise" value={frDate(last.parcel.handedToNavexAt, true)} />
                  <div><p className="text-[11px] uppercase tracking-wide text-slate-400">Statut</p><div className="mt-0.5"><StatusBadge status={last.parcel.status} /></div></div>
                  {mode === "VERIFY" && (
                    <>
                      <Info label="Date paiement" value={frDate(last.parcel.paidAt)} />
                      <Info label="Date retour" value={frDate(last.parcel.returnAt)} />
                      <Info label="Jours depuis remise" value={daysSince(last.parcel.handedToNavexAt)} />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Scans récents</span>
            <span className="text-xs text-slate-400"><span className="text-green-600 font-medium">{okTotal} ✓</span> · <span className="text-red-600 font-medium">{failTotal} ✗</span></span>
          </div>
          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
            {history.length === 0 && <p className="px-4 py-6 text-sm text-slate-400 text-center">Aucun scan</p>}
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                {h.ok ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-slate-700 truncate">{h.code}</p>
                  <p className={`text-[11px] truncate ${h.ok ? "text-slate-400" : "text-red-500"}`}>{h.ok && h.parcel ? formatTND(h.parcel.codAmount) : h.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-800 font-medium truncate">{value || "—"}</p>
    </div>
  )
}
