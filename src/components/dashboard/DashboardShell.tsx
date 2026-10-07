
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
        <div className="min-h-dvh min-w-0 bg-slate-100 dark:bg-slate-950">
            <Sidebar
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                onCloseMobile={() =>
                    setMobileOpen(false)
                }
                onToggleCollapse={() =>
                    setCollapsed((value) => !value)
                }
            />

            <div
                className={`
                    min-h-dvh
                    min-w-0
                    transition-[margin]
                    duration-200
                    ${
                        collapsed
                            ? "lg:ml-20"
                            : "lg:ml-64"
                    }
                `}
            >
                <TopNavbar
                    mobileOpen={mobileOpen}
                    onOpenMobile={() => {
                        setCollapsed(false)
                        setMobileOpen(true)
                    }}
                />

                <main
                    className="
                        min-w-0
                        min-h-[calc(100dvh-64px)]
                        px-4
                        pb-5
                        pt-4
                        sm:px-6
                        sm:pb-6
                        sm:pt-5
                        lg:min-h-[calc(100dvh-64px)]
                        lg:p-8
                        lg:pt-8
                    "
                >
                    {children}
                </main>
            </div>
        </div>
    )
}

