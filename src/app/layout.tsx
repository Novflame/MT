
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { getLocale } from "@/lib/i18n/server"
import LanguageProvider from "@/components/providers/LanguageProvider"


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
                    {children}
                </LanguageProvider>
            </body>
        </html>
    )
}

