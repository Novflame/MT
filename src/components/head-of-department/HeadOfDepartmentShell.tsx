
"use client"

import { useEffect, useState } from "react"

import HeadOfDepartmentSidebar from "./HeadOfDepartmentSidebar"
import HeadOfDepartmentTopbar from "./HeadOfDepartmentTopbar"

type Props = {
    children: React.ReactNode
}

export default function HeadOfDepartmentShell({
    children,
}: Props) {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    function closeMobileSidebar() {
        setMobileOpen(false)
    }

    function toggleSidebar() {
        setCollapsed((value) => !value)
    }

    useEffect(() => {
        if (!mobileOpen) return

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setMobileOpen(false)
            }
        }

        window.addEventListener("keydown", handleEscape)
        return () => window.removeEventListener("keydown", handleEscape)
    }, [mobileOpen])

    return (
        <div className="min-h-dvh w-full bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <HeadOfDepartmentSidebar
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                onCloseMobile={closeMobileSidebar}
                onToggleCollapse={toggleSidebar}
            />

            <div
                className={`
                    min-h-dvh
                    min-w-0
                    w-full
                    transition-[margin]
                    duration-200
                    ${collapsed
                        ? "lg:ml-20 lg:w-[calc(100%-5rem)]"
                        : "lg:ml-64 lg:w-[calc(100%-16rem)]"
                    }
                `}
            >
                <HeadOfDepartmentTopbar
                    mobileOpen={mobileOpen}
                    onOpenMobile={() => {
                        setCollapsed(false)
                        setMobileOpen(true)
                    }}
                />

                <main className="min-w-0 w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                    <div className="mx-auto w-full max-w-7xl min-w-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
