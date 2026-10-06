"use client"

import { useState } from "react"

import Sidebar from "./Sidebar"
import TopNavbar from "./TopNavbar"

type Props = {
children: React.ReactNode
}

export default function DashboardShell({
children,
}: Props) {
const [collapsed, setCollapsed] =
    useState(false)

const [mobileOpen, setMobileOpen] =
    useState(false)

return (
    <div className="min-h-dvh min-w-0 bg-slate-100">

        <Sidebar
            collapsed={collapsed}
            mobileOpen={mobileOpen}
            onCloseMobile={() =>
                setMobileOpen(false)
            }
            onToggleCollapse={() =>
                setCollapsed(value => !value)
            }
        />

        <div
            className={`
                min-h-dvh min-w-0
                transition-[margin] duration-200
                ${collapsed
                    ? "lg:ml-20"
                    : "lg:ml-64"
                }
            `}
        >

            <TopNavbar
                onOpenMobile={() =>
                    setMobileOpen(true)
                }
            />

            <main className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:p-8">
                {children}
            </main>

        </div>

    </div>
)
}
