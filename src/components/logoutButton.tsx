
"use client"

import { authClient } from "@/auth/auth-client"
import { useRouter } from "next/navigation"

export default function LogoutButton() {
    const router = useRouter()

    async function handleLogout() {
        await authClient.signOut()

        router.push("/login")
        router.refresh()
    }

    return (
        <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded"
        >
            Logout
        </button>
    )
}
