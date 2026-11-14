"use client"

import { useState } from "react"
import type { Role } from "@/auth/permissions"
import Sidebar from "./Sidebar"
import TopNavbar from "./TopNavbar"

type Props = { children: React.ReactNode; standalone?: boolean; role?: Role | null }

export default function DashboardShell({ children, standalone = false, role = null }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!standalone) return <>{children}</>

  return (
    <div className="min-h-dvh min-w-0 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar role={role} collapsed={collapsed} mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed(value => !value)} />
      <div className={`min-h-dvh min-w-0 transition-[margin] duration-200 ${collapsed ? "lg:ms-20" : "lg:ms-64"}`}>
        <TopNavbar mobileOpen={mobileOpen} onOpenMobile={() => { setCollapsed(false); setMobileOpen(true) }} />
        <main className="min-h-[calc(100dvh-4rem)] min-w-0 px-4 pb-6 pt-20 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full min-w-0 max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
