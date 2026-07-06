"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Phase = "idle" | "running" | "done" | "cancelled" | "error"
type FeedItem = { code: string; ok: boolean; label: string }

function fmtEta(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

/** Sync button + live progress dialog for the First Delivery payment sync.
 * The API streams one SSE event per parcel (rate-limited to 1/sec upstream),
 * so a batch of hundreds of parcels can take minutes — this shows real progress
 * instead of a single opaque spinner. */
export function SyncButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [total, setTotal] = useState(0)
  const [checked, setChecked] = useState(0)
  const [paid, setPaid] = useState(0)
  const [current, setCurrent] = useState<FeedItem | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  async function start() {
    setOpen(true)
    setPhase("running")
    setTotal(0); setChecked(0); setPaid(0); setCurrent(null); setFeed([]); setErrorMsg("")

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
          onDone()
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
          let evt: any
          try { evt = JSON.parse(line.slice(5).trim()) } catch { continue }

          if (evt.type === "start") {
            setTotal(evt.total)
          } else if (evt.type === "progress") {
            setChecked(evt.checked)
            setPaid(evt.paid)
            const item: FeedItem = { code: evt.code, ok: evt.ok, label: evt.label }
            setCurrent(item)
            setFeed((f) => [item, ...f].slice(0, 6))
          } else if (evt.type === "done") {
            setTotal(evt.total); setChecked(evt.checked); setPaid(evt.paid)
            setPhase(evt.cancelled ? "cancelled" : "done")
            if (!evt.cancelled) {
              toast.success(evt.checked === 0 ? "Aucun colis en cours à vérifier" : `${evt.paid} colis marqués Payé sur ${evt.checked} vérifiés`)
            }
            onDone()
          }
        }
      }
    } catch (err: any) {
      if (controller.signal.aborted) {
        setPhase("cancelled")
        onDone()
      } else {
        setPhase("error")
        setErrorMsg(err?.message || "Connexion interrompue")
      }
    }
  }

  function cancel() {
    abortRef.current?.abort()
  }

  const pct = total > 0 ? Math.min(100, Math.round((checked / total) * 100)) : 0
  const eta = fmtEta(Math.max(0, total - checked) * 1.05)
  const running = phase === "running"

  return (
    <>
      <Button onClick={start} disabled={running}>
        <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
        Synchroniser les paiements First Delivery
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (running) return; setOpen(o) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {phase === "done" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {phase === "error" && <XCircle className="h-5 w-5 text-red-600" />}
              {running && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
              Synchronisation First Delivery
            </DialogTitle>
            <DialogDescription>
              {running && "Vérification des colis un par un — limite de l'API First Delivery : 1 colis/seconde."}
              {phase === "done" && "Synchronisation terminée."}
              {phase === "cancelled" && "Synchronisation annulée — les colis déjà vérifiés restent à jour."}
              {phase === "error" && (errorMsg || "Une erreur est survenue.")}
            </DialogDescription>
          </DialogHeader>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1.5">
              <span>{checked} / {total || "…"} colis vérifiés</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                  phase === "error" ? "bg-red-500" : phase === "cancelled" ? "bg-orange-400" : "bg-blue-600"
                }`}
                style={{ width: `${running && checked === 0 ? 2 : pct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 py-2">
              <p className="text-lg font-bold tabular-nums text-slate-800">{checked}</p>
              <p className="text-[11px] text-slate-400">Vérifiés</p>
            </div>
            <div className="rounded-lg bg-green-50 py-2">
              <p className="text-lg font-bold tabular-nums text-green-600">{paid}</p>
              <p className="text-[11px] text-green-500">Payés trouvés</p>
            </div>
            <div className="rounded-lg bg-slate-50 py-2">
              <p className="text-lg font-bold tabular-nums text-slate-800">{running ? eta : "—"}</p>
              <p className="text-[11px] text-slate-400">Temps restant</p>
            </div>
          </div>

          {running && current && (
            <p className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              Vérification de {current.code}…
            </p>
          )}

          {feed.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
              {feed.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs">
                  <span className="font-mono text-slate-500 truncate">{f.code}</span>
                  <span className={`shrink-0 font-medium ${f.ok ? "text-slate-600" : "text-red-500"}`}>{f.ok ? f.label || "OK" : "Erreur"}</span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            {running ? (
              <Button variant="outline" onClick={cancel}>Annuler</Button>
            ) : (
              <Button onClick={() => setOpen(false)}>Fermer</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
