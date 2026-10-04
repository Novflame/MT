import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "./auth"
import {
    hasPermission,
    type Permission,
    type Role,
} from "./permissions"

export async function getCurrentSession() {
    const requestHeaders = await headers()

    return auth.api.getSession({
        headers: requestHeaders,
    })
}




export async function requireSession() {
    const session = await getCurrentSession()

    if (!session) {
        redirect("/login")
    }

  

    return session
}
export async function requirePermission(
    permission: Permission,
) {
    const session = await requireSession()

    const role = session.user.schoolRole as Role

    if (!hasPermission(role, permission)) {
        throw new Error("Forbidden")
    }

    return session
}
