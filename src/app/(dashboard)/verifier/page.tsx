"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { PageHeader, EmptyState, formatTND } from "@/components/parcel-ui"
import { SkeletonRows } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Copy, Download, Printer } from "lucide-react"

interface Parcel {
  _id: string
  navexTrackingCode: string
  codAmount: number
  designation?: string
  handedToNavexAt?: string
}

function frDate(d?: string) {
  return d ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", dateStyle: "short" }).format(new Date(d)) : "—"
}
function daysSince(d?: string) {
  return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0
}

export default function VerifierPage() {
  const [data, setData] = useState<{ delay: number; count: number; totalCod: number; parcels: Parcel[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/parcels/to-check").then((r) => r.json()).then((j) => setData(j.data)).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  function copyCodes() {
    const codes = (data?.parcels || []).map((p) => p.navexTrackingCode).join("\n")
    navigator.clipboard.writeText(codes).then(() => toast.success(`${data?.parcels.length} codes copiés`))
  }
  function downloadExcel() {
    const rows = [["Code First Delivery", "COD", "Designation", "Date remise", "Jours en cours"]]
    for (const p of data?.parcels || []) rows.push([p.navexTrackingCode, String(p.codAmount), p.designation || "", frDate(p.handedToNavexAt), String(daysSince(p.handedToNavexAt))])
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }))
    const a = document.createElement("a")
    a.href = url; a.download = `colis-a-verifier-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader title="Colis Dhay3in"
        subtitle={data ? `En cours depuis plus de ${data.delay} jours — à réclamer à First Delivery / livreur` : ""}
        action={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={copyCodes}><Copy className="h-4 w-4 mr-2" />Copier les codes</Button>
            <Button variant="outline" onClick={downloadExcel}><Download className="h-4 w-4 mr-2" />Télécharger Excel</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 mb-5 max-w-md">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-600">Colis Dhay3in</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-red-700">{data?.count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Valeur COD totale</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{formatTND(data?.totalCod)}</p>
        </div>
      </div>

      {!loading && (data?.parcels.length ?? 0) === 0 ? (
        <EmptyState title="Aucun colis Dhay3in." hint="Tous les colis en cours ont été payés, retournés, ou sont encore dans le délai." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 font-medium">Code First Delivery</th>
                <th className="px-3 py-2.5 font-medium text-right">COD</th>
                <th className="px-3 py-2.5 font-medium">Désignation</th>
                <th className="px-3 py-2.5 font-medium">Date remise à First Delivery</th>
                <th className="px-3 py-2.5 font-medium">Jours en cours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <SkeletonRows rows={8} cols={5} />
              ) : data?.parcels.map((p) => {
                const dw = daysSince(p.handedToNavexAt)
                return (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{p.navexTrackingCode}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">{formatTND(p.codAmount)}</td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[200px] truncate">{p.designation || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{frDate(p.handedToNavexAt)}</td>
                    <td className={`px-3 py-2.5 text-sm font-semibold ${dw > 7 ? "text-red-600" : "text-orange-600"}`}>{dw} j</td>
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
