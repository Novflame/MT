"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  ClipboardCheck,
  FileText,
  BarChart3,
  Settings,
  UserRound,
  CalendarDays,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  UserCircle,
} from "lucide-react";

import { authClient } from "@/auth/auth-client";

// =====================================================
// Types
// =====================================================

type MenuItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

// =====================================================
// Navigation
// =====================================================

const menuGroups: MenuGroup[] = [
  {
    title: "Overview",

    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "Academic",

    items: [
      {
        label: "Classes",
        href: "/classess",
        icon: School,
      },

      {
        label: "Subjects",
        href: "/subjects",
        icon: BookOpen,
      },

      {
        label: "Teacher Assignments",
        href: "/teacher-assignments",
        icon: ClipboardList,
      },

      {
        label: "Academic Years",
        href: "/academic-year",
        icon: CalendarDays,
      },
    ],
  },

  {
    title: "People",

    items: [
      {
        label: "Students",
        href: "/students",
        icon: GraduationCap,
      },

      {
        label: "Staff",
        href: "/staff",
        icon: Users,
      },

      {
        label: "Parents",
        href: "/parent-students",
        icon: UserRound,
      },
    ],
  },

  {
    title: "Attendance",

    items: [
      {
        label: "Attendance",
        href: "/attendance",
        icon: ClipboardCheck,
      },
    ],
  },

  {
    title: "Assessment",

    items: [
      {
        label: "Tests",
        href: "/tests",
        icon: ClipboardList,
      },

      {
        label: "Exams",
        href: "/exams",
        icon: FileText,
      },

      {
        label: "Grades",
        href: "/grades",
        icon: BarChart3,
      },

      {
        label: "Results",
        href: "/results",
        icon: FileText,
      },
    ],
  },

  {
    title: "Reports",

    items: [
      {
        label: "Report Cards",
        href: "/report-cards",
        icon: FileText,
      },

      {
        label: "Reports",
        href: "/reports",
        icon: FileText,
      },

      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
      },
    ],
  },
];

// =====================================================
// Props
// =====================================================

type SidebarProps = {
  mobileOpen: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
};
type School = {
  id: number;
  name: string;
  slug: string;
};

// =====================================================
// Component
// =====================================================

export default function Sidebar({
  mobileOpen,
  collapsed,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const router = useRouter();

  // logo , school name
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    async function loadSchool() {
      try {
        const response = await fetch("/api/school");

        if (!response.ok) {
          return;
        }

        const result = await response.json();

        setSchool(result.school);
      } catch (error) {
        console.error("Failed to load school:", error);
      }
    }

    loadSchool();
  }, []);

  // =================================================
  // User menu
  // =================================================

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // =================================================
  // Session
  // =================================================

  const { data: session, isPending } = authClient.useSession();

  // =================================================
  // Logout
  // =================================================

  async function handleLogout() {
    await authClient.signOut();

    router.replace("/login");
  }

  // =================================================
  // Close user menu when route changes
  // =================================================

  // useEffect(() => {

  //     setUserMenuOpen(false)

  // }, [pathname])

  // =================================================
  // Close mobile sidebar with Escape
  // =================================================

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseMobile();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onCloseMobile]);

  // =================================================
  // User information
  // =================================================

  const userName = session?.user?.name || "User";

  const userEmail = session?.user?.email || "";

  const schoolRole = session?.user?.schoolRole || "User";

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  // =================================================
  // Loading user
  // =================================================

  const displayName = isPending ? "Loading..." : userName;

  // =================================================
  // Render
  // =================================================

  return (
    <>
      {/* =========================================
                Mobile overlay
            ========================================= */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="
                        fixed inset-0 z-40
                        bg-black/40
                        lg:hidden
                    "
        />
      )}

      {/* =========================================
                Sidebar
            ========================================= */}

      <aside
        className={`
                    fixed inset-y-0 left-0 z-50
                    flex flex-col
                    border-r border-slate-800
                    bg-slate-950
                    text-slate-300
                    transition-all duration-200

                    ${collapsed ? "w-20" : "w-64"}

                    ${
                      mobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                    }
                `}
      >
        {/* =====================================
                    Brand
                ===================================== */}

        <div
          className={`
                        flex h-20 shrink-0
                        items-center
                        border-b border-slate-800

                        ${
                          collapsed
                            ? "justify-center px-3"
                            : "justify-between px-5"
                        }
                    `}
        >
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="
        flex min-w-0
        items-center gap-3
    "
          >
            {/* Logo */}

            <div
              className="
            flex h-10 w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-white
            text-sm
            font-bold
            text-slate-950
        "
            >
              SO
            </div>

            {/* School name */}

            {!collapsed && (
              <div className="min-w-0">
                <div
                  className="
                    truncate
                    text-lg
                    font-bold
                    text-white
                "
                >
                  {school?.name ?? "School"}
                </div>

                <div
                  className="
                    truncate
                    text-xs
                    text-slate-500
                "
                >
                  School Management
                </div>
              </div>
            )}
          </Link>

          {/* Mobile close */}

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="
                            rounded-lg
                            p-2
                            text-slate-400
                            hover:bg-slate-900
                            hover:text-white
                            lg:hidden
                        "
          >
            <X size={19} />
          </button>
        </div>

        {/* =====================================
                    Navigation
                ===================================== */}

        <nav
          className="
                        flex-1
                        overflow-y-auto
                        px-3
                        py-5
                    "
        >
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-6">
              {/* Group title */}

              {!collapsed && (
                <div
                  className="
                                        mb-2
                                        px-3
                                        text-[11px]
                                        font-semibold
                                        uppercase
                                        tracking-wider
                                        text-slate-500
                                    "
                >
                  {group.title}
                </div>
              )}

              {/* Items */}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={`
                                                flex
                                                items-center
                                                rounded-lg
                                                py-2.5
                                                text-sm
                                                transition

                                                ${
                                                  collapsed
                                                    ? "justify-center px-2"
                                                    : "gap-3 px-3"
                                                }

                                                ${
                                                  active
                                                    ? "bg-slate-800 text-white"
                                                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                                                }
                                            `}
                    >
                      <Icon size={18} strokeWidth={1.8} />

                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* =====================================
                    Bottom area
                ===================================== */}

        <div
          className="
                        shrink-0
                        border-t
                        border-slate-800
                        p-3
                    "
        >
          {/* Settings */}

          <Link
            href="/settings"
            onClick={onCloseMobile}
            title={collapsed ? "Settings" : undefined}
            className={`
                            flex
                            items-center
                            rounded-lg
                            py-2.5
                            text-sm
                            text-slate-400
                            transition
                            hover:bg-slate-900
                            hover:text-white

                            ${collapsed ? "justify-center px-2" : "gap-3 px-3"}
                        `}
          >
            <Settings size={18} />

            {!collapsed && <span>Settings</span>}
          </Link>

          {/* =================================
                        User section
                    ================================= */}

          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setUserMenuOpen((value) => !value)}
              title={collapsed ? displayName : undefined}
              className={`
                                flex
                                w-full
                                items-center
                                rounded-lg
                                py-2.5
                                text-left
                                transition
                                hover:bg-slate-900

                                ${
                                  collapsed
                                    ? "justify-center px-2"
                                    : "gap-3 px-2"
                                }
                            `}
            >
              {/* Avatar */}

              <div
                className="
                                    flex
                                    h-9
                                    w-9
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-slate-800
                                    text-xs
                                    font-semibold
                                    text-white
                                "
              >
                {initials}
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <p
                    className="
                                            truncate
                                            text-sm
                                            font-medium
                                            text-white
                                        "
                  >
                    {displayName}
                  </p>

                  <p
                    className="
                                            truncate
                                            text-xs
                                            text-slate-500
                                        "
                  >
                    {schoolRole}
                  </p>
                </div>
              )}
            </button>

            {/* User menu */}

            {userMenuOpen && (
              <div
                className={`
                                    absolute
                                    bottom-full
                                    mb-2
                                    overflow-hidden
                                    rounded-xl
                                    border
                                    border-slate-800
                                    bg-slate-900
                                    shadow-xl

                                    ${
                                      collapsed
                                        ? "left-14 w-56"
                                        : "left-0 right-0"
                                    }
                                `}
              >
                {/* User information */}

                <div
                  className="
                                        border-b
                                        border-slate-800
                                        px-4
                                        py-3
                                    "
                >
                  <div className="flex items-center gap-3">
                    <UserCircle size={20} className="text-slate-400" />

                    <div className="min-w-0">
                      <p
                        className="
                                                    truncate
                                                    text-sm
                                                    font-medium
                                                    text-white
                                                "
                      >
                        {userName}
                      </p>

                      <p
                        className="
                                                    truncate
                                                    text-xs
                                                    text-slate-500
                                                "
                      >
                        {userEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Profile */}
                <Link
                  href="/dashboard/profile"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onCloseMobile();
                  }}
                  className="
        flex
        items-center
        gap-3
        px-4
        py-3
        text-sm
        text-slate-300
        hover:bg-slate-800
        hover:text-white
    "
                >
                  <UserCircle size={17} />
                  Profile
                </Link>

                {/* Logout */}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        border-t
                                        border-slate-800
                                        px-4
                                        py-3
                                        text-sm
                                        text-red-400
                                        hover:bg-slate-800
                                        hover:text-red-300
                                    "
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* =================================
                        Collapse button
                    ================================= */}

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="
                            mt-3
                            hidden
                            w-full
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-slate-800
                            py-2
                            text-slate-400
                            transition
                            hover:bg-slate-900
                            hover:text-white
                            lg:flex
                        "
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>
    </>
  );
}
