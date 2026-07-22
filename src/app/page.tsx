"use client"

import Link from "next/link"
import { Package, Truck, ArrowRight, ScanLine, AlertTriangle } from "lucide-react"

const CARRIERS = [
  {
    href: "/colis",
    name: "First Delivery",
    tagline: "Suivi des paiements COD et colis en cours",
    icon: Package,
    accent: "blue",
  },
  {
    href: "/navex-colis",
    name: "Navex.tn",
    tagline: "Suivi des colis remis, payés et retournés",
    icon: Truck,
    accent: "teal",
  },
] as const

const ACCENTS = {
  blue: {
    ring: "hover:ring-blue-200 hover:border-blue-300",
    iconBg: "bg-blue-600",
    glow: "from-blue-500/10",
    text: "text-blue-700",
    arrow: "text-blue-600 group-hover:translate-x-1",
  },
  teal: {
    ring: "hover:ring-teal-200 hover:border-teal-300",
    iconBg: "bg-teal-600",
    glow: "from-teal-500/10",
    text: "text-teal-700",
    arrow: "text-teal-600 group-hover:translate-x-1",
  },
} as const

export default function RootPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-16">
      {/* Ambient background accents */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-teal-200/30 blur-3xl" />

      <div className="relative w-full max-w-3xl">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 shadow-lg shadow-blue-700/20">
            <Package className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">LogiFlow</h1>
          <p className="mt-2 text-sm text-slate-500">Centre de contrôle logistique &amp; COD</p>
        </div>

        <p className="mb-5 text-center text-sm font-medium uppercase tracking-wide text-slate-400">
          Choisissez un transporteur
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {CARRIERS.map((c) => {
            const Icon = c.icon
            const a = ACCENTS[c.accent]
            return (
              <Link
                key={c.href}
                href={c.href}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${a.ring}`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.iconBg} shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <ArrowRight className={`h-5 w-5 shrink-0 transition-transform duration-200 ${a.arrow}`} />
                </div>
                <h2 className="relative mt-4 text-lg font-semibold text-slate-900">{c.name}</h2>
                <p className="relative mt-1 text-sm text-slate-500">{c.tagline}</p>
                <div className="relative mt-4 flex items-center gap-3 text-xs font-medium text-slate-400">
                  <span className="inline-flex items-center gap-1"><ScanLine className="h-3.5 w-3.5" />Scanner</span>
                  <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Dhay3in</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
