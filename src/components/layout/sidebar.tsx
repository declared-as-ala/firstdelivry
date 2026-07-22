"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Package,
  ScanLine,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  Truck,
  ArrowLeftRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const CARRIERS = {
  "first-delivery": {
    label: "First Delivery",
    tagline: "Contrôle colis First Delivery",
    icon: PackageCheck,
    theme: {
      brandBg: "bg-blue-700",
      activeBg: "bg-blue-50",
      activeText: "text-blue-700",
      activeBar: "bg-blue-700",
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-700",
      badgeRing: "ring-blue-200",
    },
    items: [
      { href: "/colis", label: "Colis", icon: Package },
      { href: "/scan", label: "Scanner", icon: ScanLine },
      { href: "/verifier", label: "Colis Dhay3in", icon: AlertTriangle },
    ],
  },
  "navex-tn": {
    label: "Navex.tn",
    tagline: "Contrôle colis Navex.tn",
    icon: Truck,
    theme: {
      brandBg: "bg-teal-700",
      activeBg: "bg-teal-50",
      activeText: "text-teal-700",
      activeBar: "bg-teal-700",
      badgeBg: "bg-teal-50",
      badgeText: "text-teal-700",
      badgeRing: "ring-teal-200",
    },
    items: [
      { href: "/navex-colis", label: "Colis Navex", icon: Truck },
      { href: "/navex-scan", label: "Scanner Navex", icon: ScanLine },
      { href: "/navex-verifier", label: "Colis Dhay3in Navex", icon: AlertTriangle },
    ],
  },
} as const

type CarrierKey = keyof typeof CARRIERS

function NavLink({
  item, pathname, collapsed, theme,
}: {
  item: { href: string; label: string; icon: any }
  pathname: string | null
  collapsed: boolean
  theme: (typeof CARRIERS)[CarrierKey]["theme"]
}) {
  const Icon = item.icon
  const active = pathname === item.href || pathname?.startsWith(item.href + "/")
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active ? `${theme.activeBg} ${theme.activeText}` : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {active && <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r", theme.activeBar)} />}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  const carrierKey: CarrierKey = pathname?.startsWith("/navex") ? "navex-tn" : "first-delivery"
  const carrier = CARRIERS[carrierKey]
  const BrandIcon = carrier.icon

  const initials =
    session?.user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) || "LF"
  const roleLabel = session?.user?.role?.replace(/_/g, " ") || ""

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200 transition-all duration-200",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center h-16 px-4 border-b border-slate-200", collapsed && "justify-center px-0")}>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200", carrier.theme.brandBg)}>
          <BrandIcon className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="ml-3 flex flex-col min-w-0">
            <span className="text-[15px] font-semibold text-slate-900 leading-tight">LogiFlow</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide truncate">{carrier.tagline}</span>
          </div>
        )}
      </div>

      {/* Carrier badge + switch */}
      {!collapsed ? (
        <div className="px-3 pt-3">
          <Link
            href="/"
            className={cn(
              "group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors",
              carrier.theme.badgeBg, carrier.theme.badgeText, carrier.theme.badgeRing, "hover:brightness-95"
            )}
          >
            <span>{carrier.label}</span>
            <ArrowLeftRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      ) : (
        <Link href="/" className="mt-3 flex justify-center text-slate-400 hover:text-slate-700" title="Changer de transporteur">
          <ArrowLeftRight className="h-4 w-4" />
        </Link>
      )}

      {/* Nav — only the active carrier's 3 pages */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {carrier.items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} theme={carrier.theme} />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-200 p-3">
        {!collapsed && session?.user && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{session.user.name}</p>
              <p className="text-[11px] text-slate-400 capitalize truncate">{roleLabel}</p>
            </div>
          </div>
        )}
        <div className={cn("flex gap-1", collapsed && "flex-col items-center")}>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 text-slate-500 hover:text-slate-900 w-full")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <div className="flex items-center justify-center w-full"><ChevronLeft className="h-4 w-4 mr-1.5" /> Réduire</div>}
          </Button>
        </div>
      </div>
    </aside>
  )
}
