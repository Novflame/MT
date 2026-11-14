
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { getLocale } from "@/lib/i18n/server"
import LanguageProvider from "@/components/providers/LanguageProvider"
import ApplicationShell from "@/components/application/ApplicationShell"
import { getAccountState, getCurrentSession } from "@/auth/session"
import type { Role } from "@/auth/permissions"


import "./globals.css"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "School Management System",
    description:
        "School Management System",
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const locale = await getLocale()

    // Resolve the authoritative school role from the central account record.
    // Do not rely on client-side session fields to decide which navigation to show.
    let schoolRole: Role | null = null
    try {
        const session = await getCurrentSession()
        if (session?.user?.id) {
            const account = await getAccountState(session.user.id)
            if (account && !account.mustChangePassword) {
                const role = account.schoolRole
                if ([
                    "principal",
                    "deputy",
                    "head_of_class",
                    "head_of_department",
                    "teacher",
                    "parent",
                    "student",
                ].includes(role as Role)) {
                    schoolRole = role as Role
                }
            }
        }
    } catch (error) {
        // Keep public pages renderable if account lookup is temporarily unavailable.
        console.error("Unable to resolve application shell role:", error)
    }

    const direction =
        locale === "ar"
            ? "rtl"
            : "ltr"

    return (
        <html
            lang={locale}
            dir={direction}
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
            <body>
                <LanguageProvider
                    initialLocale={locale}
                >
                    <ApplicationShell role={schoolRole}>
                        {children}
                    </ApplicationShell>
                </LanguageProvider>
            </body>
        </html>
    )
}

