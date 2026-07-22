import { Package } from "lucide-react"

/** Shown by Next.js while a dashboard route segment is loading/navigating. */
export default function DashboardLoading() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-blue-400/40" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 shadow-lg shadow-blue-700/20">
          <Package className="h-7 w-7 text-white" />
        </span>
      </div>
      <p className="text-sm font-medium text-slate-400">Chargement…</p>
    </div>
  )
}
