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
    <div className="min-h-screen bg-slate-100">

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
                min-h-screen
                transition-[margin] duration-200
                md:ml-20
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

            <main className="p-4 sm:p-6 lg:p-8">
                {children}
            </main>

        </div>

    </div>
)


}
