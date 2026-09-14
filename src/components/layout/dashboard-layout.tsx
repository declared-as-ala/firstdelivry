"use client"

import { SessionProvider } from "next-auth/react"
import { Sidebar } from "./sidebar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden bg-background print:h-auto print:min-h-0 print:overflow-visible print:block">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 print:p-0 print:m-0 print:overflow-visible print:block print:h-auto print:min-h-0">
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
