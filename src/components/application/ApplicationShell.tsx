"use client"

import { usePathname } from "next/navigation"
import DashboardShell from "@/components/dashboard/DashboardShell"
import type { Role } from "@/auth/permissions"

type Props = { children: React.ReactNode; role: Role | null }

const PUBLIC_ROUTES = new Set([
  "/", "/login", "/register", "/forgot-password",
  "/reset-password", "/change-password",
])

export default function ApplicationShell({ children, role }: Props) {
  const pathname = usePathname() || "/"
  if (!role || PUBLIC_ROUTES.has(pathname)) return <>{children}</>
  return <DashboardShell standalone role={role}>{children}</DashboardShell>
}
