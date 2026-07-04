import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonPageHeader() {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>
  )
}

export function SkeletonStatGrid({ count = 9 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5">
      <Skeleton className="h-4 w-36 mb-4" />
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="text-center space-y-1.5">
            <Skeleton className="h-7 w-12 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonHandoverCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 mb-5 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-10 w-56 rounded-lg" />
    </div>
  )
}

export function SkeletonChartGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-[180px] w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="divide-y divide-slate-100">
        {/* Header */}
        <div className="flex gap-4 px-3 py-2.5">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-3 py-2.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-28" : "flex-1")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Animated skeleton <tr> rows to drop inside an existing <tbody>. */
export function SkeletonRows({ rows = 8, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-3">
              <Skeleton className={cn("h-4", c === 0 ? "w-28" : "w-16")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonDashboardCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonAlertGrid() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-16" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonLotCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="text-center space-y-1">
                <Skeleton className="h-7 w-10 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonScannerFallback() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="h-[460px] rounded-xl" />
      </div>
    </div>
  )
}
