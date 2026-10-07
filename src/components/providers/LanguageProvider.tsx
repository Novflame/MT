"use client"

import {
    createContext,
    useContext,
    useMemo,
    useState,
} from "react"

import {
    defaultLocale,
    localeDirections,
    translations,
    type Locale,
} from "@/lib/i18n/translations"

type LanguageContextValue = {
    locale: Locale
    setLocale: (locale: Locale) => void
    direction: "ltr" | "rtl"
    t: (typeof translations)[Locale]
}

const LanguageContext =
    createContext<
        LanguageContextValue | undefined
    >(undefined)

type Props = {
    children: React.ReactNode
    initialLocale?: Locale
}

export default function LanguageProvider({
    children,
    initialLocale = defaultLocale,
}: Props) {
    const [locale, setLocaleState] =
        useState<Locale>(initialLocale)

    function setLocale(nextLocale: Locale) {
        setLocaleState(nextLocale)

        document.cookie =
            `school-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`

        document.documentElement.lang =
            nextLocale

        document.documentElement.dir =
            localeDirections[nextLocale]

        window.location.reload()
    }

    const value = useMemo(
        () => ({
            locale,
            setLocale,
            direction:
                localeDirections[locale],
            t: translations[locale],
        }),
        [locale],
    )

    return (
        <LanguageContext.Provider
            value={value}
        >
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context =
        useContext(LanguageContext)

    if (!context) {
        throw new Error(
            "useLanguage must be used inside LanguageProvider",
        )
    }

    return context
}