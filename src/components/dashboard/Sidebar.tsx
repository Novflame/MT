"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen, ClipboardCheck,
  FileText, BarChart3, Settings, UserRound, CalendarDays, ClipboardList,
  LogOut, ChevronLeft, ChevronRight, X, UserCircle, FileBarChart, History,
  Award, CalendarClock, BriefcaseBusiness,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Role } from "@/auth/permissions"
import { authClient } from "@/auth/auth-client"
import { useLanguage } from "@/components/providers/LanguageProvider"

type MenuItem = { label: string; href: string; icon: LucideIcon }
type MenuGroup = { title: string; items: MenuItem[] }
type School = { id: number; name: string; slug: string; timetableEnabled?: boolean }
type SidebarProps = {
  role: Role | null; mobileOpen: boolean; collapsed: boolean;
  onCloseMobile: () => void; onToggleCollapse: () => void
}

const roleHome: Record<Role, string> = {
  principal: "/dashboard", deputy: "/dashboard", head_of_class: "/head-of-class",
  head_of_department: "/head-of-department", teacher: "/teacher",
  parent: "/parent", student: "/student",
}
const profilePath: Record<Role, string> = {
  principal: "/dashboard/profile", deputy: "/dashboard/profile",
  head_of_class: "/head-of-class/profile", head_of_department: "/head-of-department/profile",
  teacher: "/teacher/profile", parent: "/parent/profile", student: "/student/profile",
}

export default function Sidebar({ role, mobileOpen, collapsed, onCloseMobile, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const { t } = useLanguage()
  const { data: session, isPending } = authClient.useSession()
  const activeRole = role ?? (session?.user?.schoolRole as Role | undefined) ?? "teacher"
  const isCollapsed = collapsed && !mobileOpen
  const [school, setSchool] = useState<School | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadSchool() {
      try {
        const response = await fetch("/api/school", { cache: "no-store" })
        if (!response.ok) return
        const result = await response.json()
        if (cancelled) return
        setSchool(result.school ?? null)
        try {
          const timetableResponse = await fetch("/api/timetable/status", { cache: "no-store" })
          if (timetableResponse.ok && !cancelled) {
            const status = await timetableResponse.json()
            setSchool(current => current ? { ...current, timetableEnabled: Boolean(status.enabled) } : current)
          }
        } catch { /* Optional feature: keep it hidden if status is unavailable. */ }
      } catch (error) { console.error("Failed to load school navigation context:", error) }
    }
    void loadSchool()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseMobile() }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mobileOpen, onCloseMobile])

  const menuGroups = useMemo<MenuGroup[]>(() => {
    const item = (label: string, href: string, icon: LucideIcon): MenuItem => ({ label, href, icon })
    const home = item(t.navigation.dashboard, roleHome[activeRole], LayoutDashboard)
    const timetable = school?.timetableEnabled ? [item("Timetable & Sessions", "/timetable", CalendarClock)] : []

    if (activeRole === "head_of_department") return [
      { title: "Overview", items: [home] },
      { title: "Department", items: [
        item("Teachers", "/head-of-department/teachers", Users),
        item("Subjects", "/head-of-department/subjects", BookOpen),
        item("Assignments", "/head-of-department/assignments", ClipboardList),
      ] },
      { title: "Academic", items: [
        item("Tests", "/head-of-department/tests", ClipboardList),
        item("Exams", "/head-of-department/exams", FileText),
        item("Grades", "/head-of-department/grades", BarChart3),
        item("Results", "/head-of-department/results", FileBarChart),
        item("Performance", "/head-of-department/performance", BarChart3),
      ] },
      { title: "Account", items: [item(t.navigation.profile, profilePath[activeRole], UserCircle), item(t.common.settings, "/head-of-department/settings", Settings)] },
    ]

    if (activeRole === "teacher") return [
      { title: "Overview", items: [home] },
      { title: "Teaching", items: [
        item("My Assignments", "/teacher-assignments", ClipboardList),
        item("Tests", "/tests", ClipboardList), item(t.navigation.exams, "/exams", FileText),
        item(t.navigation.grades, "/grades", BarChart3), item(t.navigation.results, "/results", FileBarChart),
        item(t.navigation.attendance, "/attendance", ClipboardCheck), ...timetable,
      ] },
      { title: "Account", items: [item(t.navigation.profile, profilePath[activeRole], UserCircle)] },
    ]

    if (activeRole === "head_of_class") return [
      { title: "Overview", items: [home] },
      { title: "Class", items: [item(t.navigation.students, "/students", GraduationCap), item(t.navigation.attendance, "/attendance", ClipboardCheck), ...timetable] },
      { title: "Assessment", items: [item("Tests", "/tests", ClipboardList), item(t.navigation.grades, "/grades", BarChart3), item(t.navigation.results, "/results", FileBarChart)] },
      { title: "Account", items: [item(t.navigation.profile, profilePath[activeRole], UserCircle)] },
    ]

    if (activeRole === "parent") return [
      { title: "Overview", items: [home] },
      { title: "My family", items: [item("My Children", "/parent-students", Users), item("Results", "/results", FileBarChart), item("Report Cards", "/report-cards", FileText)] },
      { title: "Account", items: [item(t.navigation.profile, profilePath[activeRole], UserCircle)] },
    ]

    if (activeRole === "student") return [
      { title: "Overview", items: [home] },
      { title: "Learning", items: [item("Results", "/results", FileBarChart), item("Report Cards", "/report-cards", FileText)] },
      { title: "Account", items: [item(t.navigation.profile, profilePath[activeRole], UserCircle)] },
    ]

    return [
      { title: "Overview", items: [home, item(t.navigation.analytics, "/analytics", BarChart3)] },
      { title: "Academic", items: [
        item(t.navigation.classes, "/classess", School), item(t.navigation.subjects, "/subjects", BookOpen),
        item("Teacher Assignments", "/teacher-assignments", ClipboardList), ...timetable,
        item(t.navigation.academicYear, "/academic-year", CalendarDays),
        item("School History", "/school-history", History),
      ] },
      { title: "People", items: [
        item(t.navigation.students, "/students", GraduationCap), item(t.navigation.teachers, "/staff", Users),
        item("Parents", "/parent-students", UserRound), item("Student History", "/student-history", History),
        item("Graduates", "/graduates", Award), item("Departments", "/departments", BriefcaseBusiness),
      ] },
      { title: "Attendance & Assessment", items: [
        item(t.navigation.attendance, "/attendance", ClipboardCheck), item("Tests", "/tests", ClipboardList),
        item(t.navigation.exams, "/exams", FileText), item(t.navigation.grades, "/grades", BarChart3),
        item(t.navigation.results, "/results", FileBarChart),
        item("Promotion", "/promotion", GraduationCap),
      ] },
      { title: "Reports", items: [
        item(t.reports.dailyReport, "/reports/daily", FileBarChart), item("Report Cards", "/report-cards", FileText),
        item("Reports", "/reports", FileText), item(t.navigation.analytics, "/analytics", BarChart3),
      ] },
      { title: "Certificates", items: [item("Certificates", "/certificates/batch", Award), item("School Certificates", "/school-certificates", FileText)] },
      { title: "Account", items: [item(t.navigation.profile, profilePath[activeRole], UserCircle), item(t.common.settings, "/settings", Settings)] },
    ]
  }, [activeRole, school?.timetableEnabled, t])

  async function handleLogout() { await authClient.signOut(); router.replace("/login"); router.refresh() }
  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || ""
  const initials = userName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join("") || "U"

  return <>
    {mobileOpen && <button type="button" aria-label="Close navigation" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden" />}
    <aside id="primary-navigation" className={`fixed inset-y-0 start-0 z-50 flex h-dvh flex-col border-e border-slate-200 bg-white text-slate-700 shadow-xl transition-[width,transform] duration-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 ${isCollapsed ? "w-20" : "w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:translate-x-0 rtl:lg:translate-x-0"}`}>
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-800 ${isCollapsed ? "justify-center px-3" : "justify-between px-4"}`}>
        <Link href={roleHome[activeRole]} onClick={onCloseMobile} className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white">TS</span>
          {!isCollapsed && <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{school?.name ?? "School"}</span><span className="block truncate text-xs text-slate-500">School Management</span></span>}
        </Link>
        <button type="button" onClick={onCloseMobile} aria-label="Close navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"><X size={19} /></button>
      </div>
      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {menuGroups.map(group => <section key={group.title} className="mb-5">
          {!isCollapsed && <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</h2>}
          <div className="space-y-1">{group.items.map(entry => {
            const Icon = entry.icon
            const active = pathname === entry.href || (entry.href !== roleHome[activeRole] && pathname.startsWith(`${entry.href}/`))
            return <Link key={entry.href} href={entry.href} onClick={onCloseMobile} title={isCollapsed ? entry.label : undefined} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${isCollapsed ? "justify-center" : "gap-3"} ${active ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"}`}>
              <Icon size={18} strokeWidth={1.8} className="shrink-0" />{!isCollapsed && <span className="truncate">{entry.label}</span>}
            </Link>
          })}</div>
        </section>)}
      </nav>
      <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">
        <Link href={activeRole === "head_of_department" ? "/head-of-department/settings" : "/settings"} onClick={onCloseMobile} title={isCollapsed ? t.common.settings : undefined} className={`flex min-h-10 items-center rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 ${isCollapsed ? "justify-center" : "gap-3"}`}><Settings size={18} />{!isCollapsed && t.common.settings}</Link>
        <div className="relative mt-2">
          <button type="button" onClick={() => setUserMenuOpen(value => !value)} title={isCollapsed ? userName : undefined} aria-expanded={userMenuOpen} className={`flex min-h-11 w-full items-center rounded-lg px-2 py-2 text-start hover:bg-slate-100 dark:hover:bg-slate-900 ${isCollapsed ? "justify-center" : "gap-3"}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white">{initials}</span>
            {!isCollapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{isPending ? t.common.loading : userName}</span><span className="block truncate text-xs text-slate-500">{activeRole.replaceAll("_", " ")}</span></span>}
          </button>
          {userMenuOpen && <div className={`absolute bottom-full z-50 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 ${isCollapsed ? "start-14 w-56" : "inset-x-0"}`}>
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><p className="truncate text-sm font-medium text-slate-900 dark:text-white">{userName}</p><p className="truncate text-xs text-slate-500">{userEmail}</p></div>
            <Link href={profilePath[activeRole]} onClick={() => { setUserMenuOpen(false); onCloseMobile() }} className="flex min-h-11 items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><UserCircle size={17} />{t.navigation.profile}</Link>
            <button type="button" onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:border-slate-800 dark:hover:bg-red-950/30"><LogOut size={17} />{t.navigation.logout}</button>
          </div>}
        </div>
        <button type="button" onClick={onToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} className="mt-3 hidden min-h-9 w-full items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900 lg:flex">{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>
      </div>
    </aside>
  </>
}
