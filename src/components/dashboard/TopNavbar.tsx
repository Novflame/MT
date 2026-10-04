"use client"

import {
Bell,
Menu,
Search,
ChevronDown,
} from "lucide-react"

type TopNavbarProps = {
onOpenMobile: () => void
}

export default function TopNavbar({
onOpenMobile,
}: TopNavbarProps) {


return (
    <header
        className="
            sticky top-0 z-30
            flex h-16 items-center justify-between
            border-b border-slate-200
            bg-white/95 px-4
            backdrop-blur
            sm:px-6
        "
    >

        {/* ========================= */}
        {/* Left */}
        {/* ========================= */}

        <div className="flex items-center gap-3">

            {/* Mobile menu */}

            <button
                type="button"
                onClick={onOpenMobile}
                className="
                    rounded-lg p-2
                    text-slate-500
                    hover:bg-slate-100
                    md:hidden
                "
                aria-label="Open navigation"
            >
                <Menu size={21} />
            </button>


            {/* Search */}

            <div className="relative hidden sm:block">

                <Search
                    size={18}
                    className="
                        absolute left-3 top-1/2
                        -translate-y-1/2
                        text-slate-400
                    "
                />

                <input
                    type="search"
                    placeholder="Search..."
                    className="
                        h-9 w-56 rounded-lg
                        border border-slate-200
                        bg-slate-50
                        pl-10 pr-3
                        text-sm
                        outline-none
                        transition
                        focus:border-slate-400
                        focus:bg-white
                        lg:w-72
                    "
                />

            </div>

        </div>


        {/* ========================= */}
        {/* Right */}
        {/* ========================= */}

        <div className="flex items-center gap-2 sm:gap-4">

            {/* Notifications */}

            <button
                type="button"
                className="
                    relative rounded-lg p-2
                    text-slate-500
                    hover:bg-slate-100
                "
                aria-label="Notifications"
            >

                <Bell size={19} />

                <span
                    className="
                        absolute right-1.5 top-1.5
                        h-2 w-2 rounded-full
                        bg-red-500
                    "
                />

            </button>


            {/* User */}

            <button
                type="button"
                className="
                    flex items-center gap-2
                    rounded-lg p-1.5
                    hover:bg-slate-100
                "
            >

                <div
                    className="
                        flex h-9 w-9
                        items-center justify-center
                        rounded-full
                        bg-slate-900
                        text-sm font-semibold
                        text-white
                    "
                >
                    P
                </div>


                <div className="hidden text-left sm:block">

                    <div className="text-sm font-medium text-slate-800">
                        Principal
                    </div>

                    <div className="text-xs text-slate-500">
                        Administrator
                    </div>

                </div>


                <ChevronDown
                    size={16}
                    className="hidden text-slate-400 sm:block"
                />

            </button>

        </div>

    </header>
)


}
