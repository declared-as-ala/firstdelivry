"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { PageHeader, EmptyState, formatTND } from "@/components/parcel-ui"
import { SkeletonRows } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import {
  ClipboardList,
  Calendar,
  ArrowRight,
  RefreshCw,
  ScanLine,
  Truck,
} from "lucide-react"

interface PickupSummary {
  date: string // YYYY-MM-DD
  count: number
  totalCod: number
  enCoursCount: number
  payeCount: number
  retourCount: number
}

function formatDateFr(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  } catch {
    return isoDate
  }
}

function getTodayTunis(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export default function NavexPickupsPage() {
  const [pickups, setPickups] = useState<PickupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const todayIso = getTodayTunis()

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/navex-tn/pickups")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) {
          setPickups(j.data)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalAllParcels = pickups.reduce((s, p) => s + p.count, 0)
  const totalAllCod = pickups.reduce((s, p) => s + p.totalCod, 0)

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Pickups Navex.tn"
        subtitle="Historique des ramassages journaliers et bordereaux d'enlèvement Navex"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="text-xs text-slate-600">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button asChild size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
              <Link href="/navex-scan">
                <ScanLine className="h-3.5 w-3.5 mr-1.5" />
                Nouveau scan Navex
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Jours de ramassage</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{pickups.length}</p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-teal-700 uppercase tracking-wider">Total Colis Remis</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-teal-900">{totalAllParcels} colis</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valeur Totale COD</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatTND(totalAllCod)}</p>
        </div>
      </div>

      {/* Pickups List */}
      {!loading && pickups.length === 0 ? (
        <EmptyState
          title="Aucun pickup Navex enregistré"
          hint="Les ramassages s'affichent automatiquement dès que des colis sont scannés en remise à Navex.tn."
          action={
            <Button asChild className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
              <Link href="/navex-scan">
                <Truck className="h-4 w-4 mr-2" />
                Aller au Scanner Navex
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <table className="w-full">
                <tbody>
                  <SkeletonRows rows={6} cols={4} />
                </tbody>
              </table>
            </div>
          ) : (
            pickups.map((p) => {
              const isToday = p.date === todayIso
              return (
                <div
                  key={p.date}
                  className={`group relative flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-5 transition-all duration-150 hover:shadow-md ${
                    isToday
                      ? "border-teal-300 bg-teal-50/30 hover:border-teal-400"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isToday ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Calendar className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-semibold text-slate-900 capitalize">
                          {formatDateFr(p.date)}
                        </span>
                        <span className="font-mono text-xs text-slate-400">({p.date})</span>
                        {isToday && (
                          <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
                            Aujourd'hui
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {p.count} colis scanné{p.count > 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">Valeur COD : {formatTND(p.totalCod)}</span>
                        <span>•</span>
                        <span className="text-teal-700">{p.enCoursCount} en cours</span>
                        {p.payeCount > 0 && <span className="text-green-600">· {p.payeCount} payés</span>}
                        {p.retourCount > 0 && <span className="text-orange-600">· {p.retourCount} retours</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-0 flex items-center gap-2">
                    <Button
                      asChild
                      variant={isToday ? "default" : "outline"}
                      size="sm"
                      className={`h-9 text-xs gap-1.5 ${
                        isToday ? "bg-teal-700 hover:bg-teal-800 text-white" : "text-slate-700"
                      }`}
                    >
                      <Link href={`/navex-pickups/${p.date}`}>
                        <span>Bordereau &amp; Décharge</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
