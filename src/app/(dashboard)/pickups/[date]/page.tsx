"use client"

import { useEffect, useState, use } from "react"
import { useParams } from "next/navigation"
import { PickupManifest, ManifestParcel } from "@/components/pickup-manifest"
import { PageHeader, EmptyState } from "@/components/parcel-ui"
import { SkeletonRows } from "@/components/skeletons"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PickupDetailPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const unwrappedParams = use(params)
  const date = unwrappedParams.date

  const [parcels, setParcels] = useState<ManifestParcel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!date) return
    setLoading(true)
    fetch(`/api/pickups/${date}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.parcels) {
          setParcels(j.data.parcels)
        } else {
          setError(j.error || "Impossible de charger les colis")
        }
      })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false))
  }, [date])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/pickups" className="text-sm text-slate-500 hover:text-slate-800">
            ← Retour aux pickups
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <table className="w-full">
            <tbody>
              <SkeletonRows rows={10} cols={6} />
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (error || parcels.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <EmptyState
          title={`Aucun colis trouvé pour le ${date}`}
          hint="Aucun colis First Delivery n'a été scanné ou remis à cette date."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/pickups">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la liste des pickups
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <PickupManifest
      carrier="First Delivery"
      date={date}
      parcels={parcels}
      backHref="/pickups"
    />
  )
}
