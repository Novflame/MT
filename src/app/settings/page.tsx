import Link from "next/link"
import {
Building2,
CalendarDays,
DatabaseBackup,
UserCog,
UserCircle,
ChevronRight,
} from "lucide-react"

const settingsItems = [
{
href: "/settings/school",
title: "School",
description:
"Manage your school profile, identity, logo, and address.",
icon: Building2,
},
{
href: "/settings/academic",
title: "Academic",
description:
"Manage academic-year and school academic settings.",
icon: CalendarDays,
},
{
href: "/settings/users",
title: "Users",
description:
"Manage staff accounts and their access to the school system.",
icon: UserCog,
},
{
href: "/settings/acount",
title: "Account",
description:
"Manage your personal account information.",
icon: UserCircle,
},
]

export default function SettingsPage() {
return ( <main className="min-h-dvh bg-slate-50 p-4 sm:p-6"> <div className="mx-auto w-full max-w-6xl">

```
            {/* Header */}

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Settings
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                    Manage your school system settings and administrative
                    preferences.
                </p>
            </div>


            {/* Main settings */}

            <section
                aria-labelledby="settings-sections"
                className="mb-6"
            >
                <h2
                    id="settings-sections"
                    className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                    System Settings
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">

                    {settingsItems.map((item) => {
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="
                                    group
                                    rounded-xl
                                    border border-slate-200
                                    bg-white
                                    p-5
                                    shadow-sm
                                    transition
                                    hover:border-slate-300
                                    hover:shadow-md
                                    dark:border-slate-800
                                    dark:bg-slate-900
                                    dark:hover:border-slate-700
                                "
                            >
                                <div className="flex items-start gap-4">

                                    <div
                                        className="
                                            flex
                                            h-11
                                            w-11
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-lg
                                            bg-slate-100
                                            text-slate-700
                                            dark:bg-slate-800
                                            dark:text-slate-200
                                        "
                                    >
                                        <Icon
                                            size={21}
                                            strokeWidth={1.8}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">

                                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                                {item.title}
                                            </h3>

                                            <ChevronRight
                                                size={18}
                                                className="
                                                    shrink-0
                                                    text-slate-400
                                                    transition
                                                    group-hover:translate-x-0.5
                                                    group-hover:text-slate-700
                                                    dark:group-hover:text-slate-200
                                                "
                                            />
                                        </div>

                                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                            {item.description}
                                        </p>
                                    </div>

                                </div>
                            </Link>
                        )
                    })}

                </div>
            </section>


            {/* Backup & Restore */}

            <section aria-labelledby="backup-settings">
                <Link
                    href="/settings/backup"
                    className="
                        group
                        block
                        rounded-xl
                        border border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                        transition
                        hover:border-slate-300
                        hover:shadow-md
                        dark:border-slate-800
                        dark:bg-slate-900
                        dark:hover:border-slate-700
                    "
                >
                    <div className="flex items-start gap-4">

                        <div
                            className="
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-blue-50
                                text-blue-700
                                dark:bg-blue-950/40
                                dark:text-blue-300
                            "
                        >
                            <DatabaseBackup
                                size={21}
                                strokeWidth={1.8}
                            />
                        </div>

                        <div className="min-w-0 flex-1">

                            <div className="flex items-center justify-between gap-3">

                                <h2
                                    id="backup-settings"
                                    className="font-semibold text-slate-900 dark:text-white"
                                >
                                    Backup & Restore
                                </h2>

                                <ChevronRight
                                    size={18}
                                    className="
                                        shrink-0
                                        text-slate-400
                                        transition
                                        group-hover:translate-x-0.5
                                        group-hover:text-slate-700
                                        dark:group-hover:text-slate-200
                                    "
                                />

                            </div>

                            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Create, import, verify, download, and
                                restore school database backups.
                            </p>

                        </div>

                    </div>
                </Link>
            </section>

        </div>
    </main>
)


}
