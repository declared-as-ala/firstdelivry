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
  LogOut,
  PackageCheck,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const items = [
  { href: "/colis", label: "Colis", icon: Package },
  { href: "/scan", label: "Scanner", icon: ScanLine },
  { href: "/verifier", label: "Colis Dhay3in", icon: AlertTriangle },
]

const navexTnItems = [
  { href: "/navex-colis", label: "Colis Navex", icon: Truck },
  { href: "/navex-scan", label: "Scanner Navex", icon: ScanLine },
]

function NavLink({ item, pathname, collapsed }: { item: { href: string; label: string; icon: any }; pathname: string | null; collapsed: boolean }) {
  const Icon = item.icon
  const active = pathname === item.href || pathname?.startsWith(item.href + "/")
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-blue-700" />}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

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
        <div className="h-9 w-9 rounded-lg bg-blue-700 flex items-center justify-center shrink-0">
          <PackageCheck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="ml-3 flex flex-col min-w-0">
            <span className="text-[15px] font-semibold text-slate-900 leading-tight">LogiFlow</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Contrôle colis First Delivery</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}

        {!collapsed && <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Navex.tn</p>}
        {collapsed && <div className="my-3 border-t border-slate-200" />}
        {navexTnItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
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
