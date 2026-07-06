"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react"

type Phase = "idle" | "running" | "done" | "cancelled" | "error"

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

/** Drives the First Delivery payment sync over SSE. Never blocks the UI —
 * the table stays visible and interactive while this runs in the background. */
export function useNavexSync(opts: { onProgress?: (e: SyncProgressEvent) => void; onDone?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [total, setTotal] = useState(0)
  const [checked, setChecked] = useState(0)
  const [paid, setPaid] = useState(0)
  const [current, setCurrent] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  async function start() {
    setPhase("running")
    setTotal(0); setChecked(0); setPaid(0); setCurrent(null); setErrorMsg("")

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/parcels/sync", { method: "POST", signal: controller.signal })
      const contentType = res.headers.get("content-type") || ""

      if (!contentType.includes("text/event-stream")) {
        const j = await res.json().catch(() => null)
        if (j?.success) {
          setPhase("done")
          toast.success(`${j.data.paid} colis marqués Payé`)
          opts.onDone?.()
        } else {
          setPhase("error")
          setErrorMsg(j?.error?.message || j?.error || "Synchronisation indisponible")
        }
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split("\n\n")
        buffer = chunks.pop() || ""

        for (const chunk of chunks) {
          const line = chunk.trim()
          if (!line.startsWith("data:")) continue
          let evt: SyncProgressEvent
          try { evt = JSON.parse(line.slice(5).trim()) } catch { continue }

          if (evt.type === "start") {
            setTotal(evt.total)
          } else if (evt.type === "progress") {
            setChecked(evt.checked)
            setPaid(evt.paid)
            setCurrent(evt.code || null)
            opts.onProgress?.(evt)
          } else if (evt.type === "done") {
            setTotal(evt.total); setChecked(evt.checked); setPaid(evt.paid)
            setPhase(evt.cancelled ? "cancelled" : "done")
            if (!evt.cancelled) {
              toast.success(evt.checked === 0 ? "Aucun colis en cours à vérifier" : `${evt.paid} colis marqués Payé sur ${evt.checked} vérifiés`)
            }
            opts.onDone?.()
          }
        }
      }
    } catch (err: any) {
      if (controller.signal.aborted) {
        setPhase("cancelled")
        opts.onDone?.()
      } else {
        setPhase("error")
        setErrorMsg(err?.message || "Connexion interrompue")
      }
    }
  }

  function cancel() {
    abortRef.current?.abort()
  }

  return { phase, total, checked, paid, current, errorMsg, start, cancel }
}

function fmtEta(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

/** Slim, non-blocking progress banner — sits above the table, never covers it. */
export function SyncBar({ sync }: { sync: ReturnType<typeof useNavexSync> }) {
  const { phase, total, checked, paid, current, errorMsg, cancel } = sync
  if (phase === "idle") return null

  const running = phase === "running"
  const pct = total > 0 ? Math.min(100, Math.round((checked / total) * 100)) : running ? 2 : 0
  const eta = fmtEta(Math.max(0, total - checked) * 1.05)

  const tone =
    phase === "error" ? "border-red-200 bg-red-50" :
    phase === "cancelled" ? "border-orange-200 bg-orange-50" :
    phase === "done" ? "border-green-200 bg-green-50" :
    "border-blue-200 bg-blue-50"

  const barColor =
    phase === "error" ? "bg-red-500" :
    phase === "cancelled" ? "bg-orange-400" :
    phase === "done" ? "bg-green-600" :
    "bg-blue-600"

  return (
    <div className={`relative overflow-hidden rounded-xl border mb-4 ${tone}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {running && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />}
        {phase === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
        {phase === "error" && <XCircle className="h-4 w-4 shrink-0 text-red-600" />}
        {phase === "cancelled" && <XCircle className="h-4 w-4 shrink-0 text-orange-500" />}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-slate-700">
            <span>
              {running && `Synchronisation en cours — ${checked}/${total} vérifiés (${pct}%)`}
              {phase === "done" && `Synchronisation terminée — ${paid} colis marqués Payé sur ${checked} vérifiés`}
              {phase === "cancelled" && `Synchronisation annulée — ${checked}/${total} vérifiés avant l'arrêt`}
              {phase === "error" && (errorMsg || "Erreur de synchronisation")}
            </span>
            {running && paid > 0 && <span className="text-xs font-semibold text-green-600">+{paid} payés trouvés</span>}
            {running && <span className="text-xs text-slate-400">· ~{eta} restant</span>}
          </div>
          {running && current && (
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
