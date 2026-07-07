"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, CheckCircle2, XCircle, X, RefreshCw } from "lucide-react"

type Phase = "idle" | "running" | "done" | "cancelled" | "error"
type AttemptOutcome = "done" | "cancelled" | "retry" | "fatal"

export interface SyncProgressEvent {
  type: "start" | "progress" | "done"
  code?: string
  ok?: boolean
  justPaid?: boolean
  label?: string
  checked: number
  total: number
  paid: number
  cancelled?: boolean
}

// Worst case per parcel is ~2x the backend's own 20s per-call timeout, plus the
// 1s rate-limit delay — this must comfortably exceed that so it never fires on a
// merely-slow parcel, only on a genuinely dead connection.
const STALL_MS = 45000
const WATCHDOG_CHECK_MS = 5000
const MAX_RECONNECTS = 8
const RECONNECT_BACKOFF_MS = 1500

/** Drives the First Delivery payment sync over SSE. Never blocks the UI —
 * the table stays visible and interactive while this runs in the background.
 * If the connection goes silent for too long (dropped wifi, laptop sleep, a
 * proxy killing an idle socket, …) it automatically reconnects: the backend
 * only ever re-checks parcels still EN_COURS, so resuming is always safe and
 * never double-counts or re-flags an already-paid parcel. */
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
  const lastEventAtRef = useRef(0)
  const checkedBaseRef = useRef(0)
  const paidBaseRef = useRef(0)

  async function runAttempt(controller: AbortController): Promise<AttemptOutcome> {
    let attemptChecked = 0
    let attemptPaid = 0

    try {
      const res = await fetch("/api/parcels/sync", { method: "POST", signal: controller.signal })
      const contentType = res.headers.get("content-type") || ""

      if (!contentType.includes("text/event-stream")) {
        const j = await res.json().catch(() => null)
        if (j?.success) {
          setTotal(checkedBaseRef.current + (j.data.checked || 0))
          setChecked(checkedBaseRef.current + (j.data.checked || 0))
          setPaid(paidBaseRef.current + (j.data.paid || 0))
          setPhase("done")
          toast.success(`${j.data.paid} colis marqués Payé`)
          opts.onDone?.()
          return "done"
        }
        setPhase("error")
        setErrorMsg(j?.error?.message || j?.error || "Synchronisation indisponible")
        return "fatal"
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        lastEventAtRef.current = Date.now()
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split("\n\n")
        buffer = chunks.pop() || ""

        for (const chunk of chunks) {
          const line = chunk.trim()
          if (!line.startsWith("data:")) continue
          let evt: SyncProgressEvent
          try { evt = JSON.parse(line.slice(5).trim()) } catch { continue }

          if (evt.type === "start") {
            setReconnectAttempt(0)
            setTotal(checkedBaseRef.current + evt.total)
          } else if (evt.type === "progress") {
            setReconnectAttempt(0)
            attemptChecked = evt.checked
            attemptPaid = evt.paid
            setChecked(checkedBaseRef.current + evt.checked)
            setPaid(paidBaseRef.current + evt.paid)
            setCurrent(evt.code || null)
            opts.onProgress?.(evt)
          } else if (evt.type === "done") {
            attemptChecked = evt.checked
            attemptPaid = evt.paid
            checkedBaseRef.current += evt.checked
            paidBaseRef.current += evt.paid
            setTotal(checkedBaseRef.current)
            setChecked(checkedBaseRef.current)
            setPaid(paidBaseRef.current)
            setPhase(evt.cancelled ? "cancelled" : "done")
            if (!evt.cancelled) {
              toast.success(checkedBaseRef.current === 0 ? "Aucun colis en cours à vérifier" : `${paidBaseRef.current} colis marqués Payé sur ${checkedBaseRef.current} vérifiés`)
            }
            opts.onDone?.()
            return evt.cancelled ? "cancelled" : "done"
          }
        }
      }

      // Connection closed without an explicit "done" — treat as a drop and reconnect.
      checkedBaseRef.current += attemptChecked
      paidBaseRef.current += attemptPaid
      return "retry"
    } catch {
      checkedBaseRef.current += attemptChecked
      paidBaseRef.current += attemptPaid
      if (manualStopRef.current) {
        setPhase("cancelled")
        opts.onDone?.()
        return "cancelled"
      }
      return "retry"
    }
  }

  async function start() {
    setPhase("running")
    manualStopRef.current = false
    checkedBaseRef.current = 0
    paidBaseRef.current = 0
    setTotal(0); setChecked(0); setPaid(0); setCurrent(null); setErrorMsg(""); setReconnectAttempt(0)

    let attempt = 0
    while (true) {
      const controller = new AbortController()
      abortRef.current = controller
      lastEventAtRef.current = Date.now()

      const watchdog = setInterval(() => {
        if (Date.now() - lastEventAtRef.current > STALL_MS) controller.abort()
      }, WATCHDOG_CHECK_MS)

      const outcome = await runAttempt(controller)
      clearInterval(watchdog)

      if (outcome === "done" || outcome === "cancelled" || outcome === "fatal") return
      if (manualStopRef.current) return

      attempt++
      if (attempt > MAX_RECONNECTS) {
        setPhase("error")
        setErrorMsg("Connexion perdue à plusieurs reprises. Réessayez plus tard.")
        return
      }
      setReconnectAttempt(attempt)
      await new Promise((r) => setTimeout(r, RECONNECT_BACKOFF_MS))
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
              {reconnecting && `Connexion interrompue — reconnexion automatique (tentative ${reconnectAttempt}/${MAX_RECONNECTS})…`}
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
