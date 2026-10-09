
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
  FileBarChart,
  History,
  Award,
} from "lucide-react";

import { authClient } from "@/auth/auth-client";
import { useLanguage } from "@/components/providers/LanguageProvider";

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

type School = {
  id: number;
  name: string;
  slug: string;
};

type SidebarProps = {
  mobileOpen: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
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

  const { t } = useLanguage();

  // =================================================
  // Session
  // =================================================

  const { data: session, isPending } = authClient.useSession();

  const schoolRole = session?.user?.schoolRole || "";

  // =================================================
  // School
  // =================================================

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
  // Logout
  // =================================================

  async function handleLogout() {
    await authClient.signOut();

    router.replace("/login");
  }

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

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  const displayName = isPending ? t.common.loading : userName;

  // =================================================
  // Daily Report visibility
  //
  // Principal has reports.read.
  // Keep this role logic unchanged.
  // =================================================

  const canViewDailyReport = [
    "principal",
    "deputy",
    "head_of_department",
    "parent",
    "student",
  ].includes(schoolRole);

  // =====================================================
  // Navigation
  // =====================================================

  const menuGroups: MenuGroup[] = [
    {
      title: "Overview",
      items: [
        {
          label: t.navigation.dashboard,
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },

    {
      title: "Academic",
      items: [
        {
          label: t.navigation.classes,
          href: "/classess",
          icon: School,
        },

        {
          label: t.navigation.subjects,
          href: "/subjects",
          icon: BookOpen,
        },

        {
          label: "Teacher Assignments",
          href: "/teacher-assignments",
          icon: ClipboardList,
        },

        {
          label: t.navigation.academicYear,
          href: "/academic-year",
          icon: CalendarDays,
        },
        ...(["principal", "deputy"].includes(schoolRole)
          ? [{
              label: "School History",
              href: "/school-history",
              icon: History,
            }]
          : []),
      ],
    },

    {
      title: "People",
      items: [
        {
          label: t.navigation.students,
          href: "/students",
          icon: GraduationCap,
        },

        {
          label: t.navigation.teachers,
          href: "/staff",
          icon: Users,
        },

        {
          label: "Parents",
          href: "/parent-students",
          icon: UserRound,
        },
        ...(!["student", "parent"].includes(schoolRole)
          ? [{
              label: "Student History",
              href: "/student-history",
              icon: History,
            }]
          : []),
        ...(["principal", "deputy"].includes(schoolRole)
          ? [{
              label: "Graduates",
              href: "/graduates",
              icon: Award,
            }]
          : []),
      ],
    },

    {
      title: "Attendance",
      items: [
        {
          label: t.navigation.attendance,
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
          label: t.navigation.exams,
          href: "/exams",
          icon: FileText,
        },

        {
          label: t.navigation.grades,
          href: "/grades",
          icon: BarChart3,
        },

        {
          label: t.navigation.results,
          href: "/results",
          icon: FileText,
        },
      ],
    },

    {
  title: "Reports",
  items: [
    {
      label: t.reports.dailyReport,
      href: "/reports/daily",
      icon: FileBarChart,
    },
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
      label: t.navigation.analytics,
      href: "/analytics",
      icon: BarChart3,
    },
  ],
},
  ];

  // =====================================================
  // Render
  // =====================================================

  return (
    <>
      {/* Mobile overlay */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="
            fixed inset-0 z-40
            bg-black/40
            backdrop-blur-[1px]
            lg:hidden
          "
        />
      )}

      {/* Sidebar */}

      <aside
        id="primary-navigation"
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r border-slate-800
          bg-slate-950
          text-slate-300
          shadow-xl
          transition-transform duration-200
          dark:border-slate-800
          dark:bg-slate-950

          ${collapsed ? "w-64 lg:w-20" : "w-64"}

          ${
            mobileOpen
              ? "translate-x-0"
              : "hidden -translate-x-full lg:flex lg:translate-x-0"
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
            className="flex min-w-0 items-center gap-3"
          >
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
                shadow-sm
              "
            >
              SO
            </div>

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

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="
              rounded-lg
              p-2
              text-slate-400
              transition
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
          aria-label="Primary navigation"
          className="
            flex-1
            overflow-y-auto
            px-3
            py-5
          "
        >
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-6">
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
                        min-h-10
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
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-400 hover:bg-slate-900 hover:text-white"
                        }
                      `}
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.8}
                        className="shrink-0"
                      />

                      {!collapsed && (
                        <span className="truncate">
                          {item.label}
                        </span>
                      )}
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
            title={collapsed ? t.common.settings : undefined}
            className={`
              flex
              min-h-10
              items-center
              rounded-lg
              py-2.5
              text-sm
              text-slate-400
              transition
              hover:bg-slate-900
              hover:text-white

              ${
                collapsed
                  ? "justify-center px-2"
                  : "gap-3 px-3"
              }
            `}
          >
            <Settings size={18} />

            {!collapsed && (
              <span>{t.common.settings}</span>
            )}
          </Link>

          {/* User section */}

          <div className="relative mt-2">
            <button
              type="button"
              onClick={() =>
                setUserMenuOpen((value) => !value)
              }
              title={collapsed ? displayName : undefined}
              className={`
                flex
                min-h-10
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
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-blue-600
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
                <div
                  className="
                    border-b
                    border-slate-800
                    px-4
                    py-3
                  "
                >
                  <div className="flex items-center gap-3">
                    <UserCircle
                      size={20}
                      className="shrink-0 text-slate-400"
                    />

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

                <Link
                  href="/dashboard/profile"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onCloseMobile();
                  }}
                  className="
                    flex
                    min-h-11
                    items-center
                    gap-3
                    px-4
                    py-3
                    text-sm
                    text-slate-300
                    transition
                    hover:bg-slate-800
                    hover:text-white
                  "
                >
                  <UserCircle size={17} />
                  {t.navigation.profile}
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex
                    min-h-11
                    w-full
                    items-center
                    gap-3
                    border-t
                    border-slate-800
                    px-4
                    py-3
                    text-sm
                    text-red-400
                    transition
                    hover:bg-slate-800
                    hover:text-red-300
                  "
                >
                  <LogOut size={17} />
                  {t.navigation.logout}
                </button>
              </div>
            )}
          </div>

          {/* Collapse button */}

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            className="
              mt-3
              hidden
              min-h-10
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
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

