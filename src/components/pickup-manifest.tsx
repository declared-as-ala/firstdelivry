"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatTND, StatusBadge } from "@/components/parcel-ui"
import { SignaturePad } from "@/components/signature-pad"
import {
  Printer,
  ArrowLeft,
  Download,
  PenTool,
  CheckCircle2,
  Package,
  Calendar,
  Building2,
  Truck,
  RotateCcw,
} from "lucide-react"

export interface ManifestParcel {
  _id: string
  trackingCode: string
  codAmount: number
  designation?: string
  clientName?: string
  clientPhone?: string
  status: string
  handedToNavexAt?: string
}

interface PickupManifestProps {
  carrier: "First Delivery" | "Navex.tn"
  date: string // YYYY-MM-DD
  parcels: ManifestParcel[]
  backHref: string
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

export function PickupManifest({ carrier, date, parcels, backHref }: PickupManifestProps) {
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [signingRole, setSigningRole] = useState<"shipper" | "driver">("driver")
  const [shipperSignature, setShipperSignature] = useState<string | null>(null)
  const [driverSignature, setDriverSignature] = useState<string | null>(null)
  const [driverName, setDriverName] = useState("")
  const [driverPhone, setDriverPhone] = useState("")

  const totalCod = parcels.reduce((sum, p) => sum + (p.codAmount || 0), 0)
  const formattedDate = formatDateFr(date)

  const downloadCsv = () => {
    const rows = [
      ["N°", "Code de suivi", "Destinataire", "Telephone", "Designation", "Montant COD (DT)", "Statut"],
    ]
    parcels.forEach((p, index) => {
      rows.push([
        String(index + 1),
        p.trackingCode,
        p.clientName || "",
        p.clientPhone || "",
        p.designation || "",
        String(p.codAmount || 0),
        p.status,
      ])
    })

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `bordereau-${carrier.toLowerCase().replace(/\s+/g, "-")}-${date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveSignature = (dataUrl: string) => {
    if (signingRole === "shipper") {
      setShipperSignature(dataUrl)
    } else {
      setDriverSignature(dataUrl)
    }
    setShowSignaturePad(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Top Action Bar - Hidden in Print */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux pickups
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsv} className="h-9 gap-1.5 text-xs text-slate-700">
            <Download className="h-3.5 w-3.5" />
            Exporter CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSigningRole("driver")
              setShowSignaturePad(true)
            }}
            className="h-9 gap-1.5 text-xs text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
          >
            <PenTool className="h-3.5 w-3.5" />
            Signature Livreur
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSigningRole("shipper")
              setShowSignaturePad(true)
            }}
            className="h-9 gap-1.5 text-xs text-slate-700"
          >
            <PenTool className="h-3.5 w-3.5" />
            Signature Expéditeur
          </Button>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="h-9 gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer le bordereau (A4)
          </Button>
        </div>
      </div>

      {/* Signature Pad Modal / Drawer if open */}
      {showSignaturePad && (
        <div className="mb-6 print:hidden">
          <SignaturePad
            title={signingRole === "driver" ? `Signature du livreur (${carrier})` : "Signature de l'expéditeur"}
            description={
              signingRole === "driver"
                ? "Faites signer le livreur sur l'écran pour certifier la prise en charge des colis."
                : "Apposez votre signature en tant que responsable de la remise des colis."
            }
            initialSignature={signingRole === "driver" ? driverSignature || undefined : shipperSignature || undefined}
            onSave={handleSaveSignature}
            onCancel={() => setShowSignaturePad(false)}
          />
        </div>
      )}

      {/* Driver info inputs (on screen) - Hidden in Print */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          <Truck className="h-4 w-4 text-slate-400" />
          Informations Livreur (Optionnel pour impression)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nom & Prénom du livreur</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Ex: Mohamed Ben Salah"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">N° Téléphone ou CIN</label>
            <input
              type="text"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="Ex: 98 123 456"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Printable Sheet (Manifest) */}
      <div className="print-manifest rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white print:bg-black">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                    Bordereau d'enlèvement & Décharge
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">LogiFlow — Contrôle Logistique & Remise Colis</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 uppercase print:border-black">
                Transporteur : {carrier}
              </span>
              <p className="text-xs text-slate-500 mt-1.5 font-mono">Date : {date}</p>
            </div>
          </div>

          {/* Key Manifest Meta */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs print:bg-white print:border-black">
            <div>
              <span className="text-slate-500 uppercase tracking-wide font-medium block">Date de remise</span>
              <span className="text-slate-900 font-semibold text-sm capitalize">{formattedDate}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide font-medium block">Total Colis Remis</span>
              <span className="text-slate-900 font-bold text-sm tabular-nums">{parcels.length} colis</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide font-medium block">Valeur COD Totale</span>
              <span className="text-slate-900 font-bold text-sm tabular-nums">{formatTND(totalCod)}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wide font-medium block">Livreur assigné</span>
              <span className="text-slate-900 font-semibold text-sm truncate">
                {driverName || "À compléter à la signature"}
              </span>
            </div>
          </div>
        </div>

        {/* Parcels Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 uppercase font-semibold print:bg-slate-200 print:border-black">
                <th className="py-2.5 px-3 w-10 text-center">N°</th>
                <th className="py-2.5 px-3 font-mono">Code de suivi</th>
                <th className="py-2.5 px-3">Destinataire & Tél</th>
                <th className="py-2.5 px-3">Désignation</th>
                <th className="py-2.5 px-3 text-right">Montant COD</th>
                <th className="py-2.5 px-3 text-center print:table-cell hidden sm:table-cell">Statut</th>
                <th className="py-2.5 px-3 text-center w-14">Pointage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {parcels.map((p, idx) => (
                <tr key={p._id} className="hover:bg-slate-50/80 print:hover:bg-transparent">
                  <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">{p.trackingCode}</td>
                  <td className="py-2 px-3">
                    <div className="font-medium text-slate-800">{p.clientName || "—"}</div>
                    {p.clientPhone && <div className="text-[11px] font-mono text-slate-500">{p.clientPhone}</div>}
                  </td>
                  <td className="py-2 px-3 text-slate-600 max-w-[220px] truncate">{p.designation || "—"}</td>
                  <td className="py-2 px-3 text-right font-semibold tabular-nums text-slate-900">
                    {formatTND(p.codAmount)}
                  </td>
                  <td className="py-2 px-3 text-center print:table-cell hidden sm:table-cell">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="mx-auto h-4 w-4 rounded border border-slate-400 print:border-black" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-slate-900 print:border-black print:bg-transparent">
                <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                  Total Remis :
                </td>
                <td className="py-3 px-3 text-right text-sm tabular-nums text-blue-900 print:text-black">
                  {formatTND(totalCod)}
                </td>
                <td colSpan={2} className="py-3 px-3 text-center text-xs">
                  {parcels.length} colis
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Discharge / Signatures Block */}
        <div className="print-avoid-break mt-8 pt-6 border-t-2 border-slate-300 print:border-black">
          <p className="text-xs text-slate-500 italic mb-4 text-center print:text-black">
            La signature de ce document certifie le transfert de garde physique des colis énumérés ci-dessus entre l'expéditeur et le transporteur.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {/* Shipper Box */}
            <div className="rounded-xl border-2 border-slate-300 p-4 print:border-black flex flex-col justify-between h-44">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Expéditeur / Entrepôt
                  </span>
                  <span className="text-[10px] text-slate-400 print:text-slate-600">Cachet & Signature</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Certifie avoir remis <strong className="text-slate-900 font-semibold">{parcels.length} colis</strong> en bon état ce jour.
                </p>
              </div>

              <div className="relative flex items-center justify-center border-t border-dashed border-slate-300 pt-2 min-h-[70px]">
                {shipperSignature ? (
                  <img src={shipperSignature} alt="Signature Expéditeur" className="max-h-16 object-contain" />
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Signature & Cachet de l'expéditeur</span>
                )}
              </div>
            </div>

            {/* Carrier / Driver Box */}
            <div className="rounded-xl border-2 border-slate-300 p-4 print:border-black flex flex-col justify-between h-44">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Livreur / {carrier}
                  </span>
                  <span className="text-[10px] text-slate-400 print:text-slate-600">Signature de réception</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {driverName ? (
                    <>
                      Reçu par : <strong className="text-slate-900">{driverName}</strong>
                      {driverPhone && ` (${driverPhone})`}
                    </>
                  ) : (
                    "Je soussigné certifie avoir pris en charge les colis listés ci-dessus."
                  )}
                </p>
              </div>

              <div className="relative flex items-center justify-center border-t border-dashed border-slate-300 pt-2 min-h-[70px]">
                {driverSignature ? (
                  <img src={driverSignature} alt="Signature Livreur" className="max-h-16 object-contain" />
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Signature manuscrite du livreur</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 print:text-slate-600">
            <span>LogiFlow Control System</span>
            <span>Document imprimé le {new Date().toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
