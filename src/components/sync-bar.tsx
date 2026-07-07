"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, CheckCircle2, XCircle, X, RefreshCw } from "lucide-react"

type Phase = "idle" | "running" | "done" | "cancelled" | "error"

export interface SyncProgressEvent {
  code?: string
  ok?: boolean
  justPaid?: boolean
  label?: string
  checked: number
  total: number
  paid: number
}

interface SyncBatchItem { code: string; ok: boolean; justPaid: boolean; label: string }
interface SyncBatchData { processed: number; remainingBefore: number; paid: number; items: SyncBatchItem[]; done: boolean }

const MAX_RETRIES = 5
const RETRY_BACKOFF_MS = 2000
// Purely cosmetic: reveals items within a batch one at a time instead of all at
// once, so a batch of 5 still feels like watching each parcel get checked.
const REVEAL_STAGGER_MS = 180

/** Drives the First Delivery payment sync via short repeated batch calls (not a
 * long-lived stream) — each call finishes in a few seconds, so no reverse proxy,
 * load balancer, or CDN idle/duration limit ever gets a chance to silently kill
 * it mid-flight. The table stays visible and interactive the whole time.
 * Resuming after any failure is always safe: the backend only ever re-checks
 * parcels still EN_COURS, so it can never double-count or re-flag a paid one. */
export function useNavexSync(opts: { onProgress?: (e: SyncProgressEvent) => void; onDone?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [total, setTotal] = useState(0)
  const [checked, setChecked] = useState(0)
  const [paid, setPaid] = useState(0)
  const [current, setCurrent] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const manualStopRef = useRef(false)

  async function start() {
    setPhase("running")
    manualStopRef.current = false
    setTotal(0); setChecked(0); setPaid(0); setCurrent(null); setErrorMsg(""); setReconnectAttempt(0)

    let checkedSoFar = 0
    let paidSoFar = 0
    let retry = 0

    while (true) {
      if (manualStopRef.current) { setPhase("cancelled"); opts.onDone?.(); return }

      const controller = new AbortController()
      abortRef.current = controller

      let json: any
      try {
        const res = await fetch("/api/parcels/sync", { method: "POST", signal: controller.signal })
        json = await res.json().catch(() => null)
      } catch {
        if (manualStopRef.current) { setPhase("cancelled"); opts.onDone?.(); return }
        retry++
        if (retry > MAX_RETRIES) {
          setPhase("error")
          setErrorMsg("Connexion perdue à plusieurs reprises. Réessayez plus tard.")
          return
        }
        setReconnectAttempt(retry)
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
        continue
      }

      if (!json?.success) {
        setPhase("error")
        setErrorMsg(json?.error?.message || json?.error || "Synchronisation indisponible")
        return
      }

      retry = 0
      setReconnectAttempt(0)

      const data = json.data as SyncBatchData
      if (data.remainingBefore === 0) {
        setPhase("done")
        toast.success("Aucun colis en cours à vérifier")
        opts.onDone?.()
        return
      }

      const remainingAfter = Math.max(0, data.remainingBefore - data.items.length)
      for (const item of data.items) {
        if (manualStopRef.current) { setPhase("cancelled"); opts.onDone?.(); return }
        checkedSoFar++
        if (item.justPaid) paidSoFar++
        const totalEstimate = checkedSoFar + remainingAfter
        setCurrent(item.code)
        setChecked(checkedSoFar)
        setPaid(paidSoFar)
        setTotal(totalEstimate)
        opts.onProgress?.({ code: item.code, ok: item.ok, justPaid: item.justPaid, label: item.label, checked: checkedSoFar, total: totalEstimate, paid: paidSoFar })
        await new Promise((r) => setTimeout(r, REVEAL_STAGGER_MS))
      }

      if (data.done) {
        setPhase("done")
        toast.success(`${paidSoFar} colis marqués Payé sur ${checkedSoFar} vérifiés`)
        opts.onDone?.()
        return
      }
    }
  }

  function cancel() {
    manualStopRef.current = true
    abortRef.current?.abort()
  }

  return { phase, total, checked, paid, current, errorMsg, reconnectAttempt, start, cancel }
}

function fmtEta(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

/** Slim, non-blocking progress banner — sits above the table, never covers it. */
export function SyncBar({ sync }: { sync: ReturnType<typeof useNavexSync> }) {
  const { phase, total, checked, paid, current, errorMsg, reconnectAttempt, cancel } = sync
  if (phase === "idle") return null

  const running = phase === "running"
  const reconnecting = running && reconnectAttempt > 0
  const pct = total > 0 ? Math.min(100, Math.round((checked / total) * 100)) : running ? 2 : 0
  const eta = fmtEta(Math.max(0, total - checked) * 1.05)

  const tone =
    phase === "error" ? "border-red-200 bg-red-50" :
    phase === "cancelled" ? "border-orange-200 bg-orange-50" :
    phase === "done" ? "border-green-200 bg-green-50" :
    reconnecting ? "border-orange-200 bg-orange-50" :
    "border-blue-200 bg-blue-50"

  const barColor =
    phase === "error" ? "bg-red-500" :
    phase === "cancelled" ? "bg-orange-400" :
    phase === "done" ? "bg-green-600" :
    reconnecting ? "bg-orange-400" :
    "bg-blue-600"

  return (
    <div className={`relative overflow-hidden rounded-xl border mb-4 ${tone}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {running && !reconnecting && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />}
        {reconnecting && <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-orange-500" />}
        {phase === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
        {phase === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-600" />}
        {phase === "cancelled" && <XCircle className="h-4 w-4 shrink-0 text-orange-500" />}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-slate-700">
            <span>
              {reconnecting && `Connexion interrompue — nouvelle tentative (${reconnectAttempt}/${MAX_RETRIES})…`}
              {running && !reconnecting && `Synchronisation en cours — ${checked}/${total} vérifiés (${pct}%)`}
              {phase === "done" && `Synchronisation terminée — ${paid} colis marqués Payé sur ${checked} vérifiés`}
              {phase === "cancelled" && `Synchronisation annulée — ${checked}/${total} vérifiés avant l'arrêt`}
              {phase === "error" && (errorMsg || "Erreur de synchronisation")}
            </span>
            {running && paid > 0 && <span className="text-xs font-semibold text-green-600">+{paid} payés trouvés</span>}
            {running && !reconnecting && <span className="text-xs text-slate-400">· ~{eta} restant</span>}
          </div>
          {running && !reconnecting && current && (
            <p className="mt-0.5 truncate font-mono text-xs text-slate-400">Vérification de {current}…</p>
          )}
        </div>

        {running && (
          <button onClick={cancel} className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white/60">
            <X className="h-3.5 w-3.5" />Annuler
          </button>
        )}
      </div>
      <div className="h-1 w-full bg-black/5">
        <div className={`h-full transition-[width] duration-300 ease-out ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
