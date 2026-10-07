
import { cookies } from "next/headers"

import {
    defaultLocale,
    type Locale,
} from "./translations"

const LOCALE_COOKIE = "school-locale"

function isLocale(
    value: string | undefined,
): value is Locale {
    return (
        value === "en" ||
        value === "ar" ||
        value === "fr"
    )
}

export async function getLocale(): Promise<Locale> {
    const cookieStore = await cookies()

    const value =
        cookieStore.get(LOCALE_COOKIE)?.value

    if (isLocale(value)) {
        return value
    }

    return defaultLocale
}

