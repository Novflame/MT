import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { getSchoolDB } from "@/db"
import { staffProfiles } from "@/db/schema"
import { requirePermission } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user, session as centralSession } from "@/db/centeral-schema"
import { auditAccountAction, requestAccountEmailVerification } from "@/auth/account-provisioning"
import { auth } from "@/auth/auth"
import { isEmailDeliveryConfigured } from "@/lib/email"

type Params = {
    params: Promise<{
        id: string
    }>
}


// =====================================================
// PATCH
// Change role or account status
// =====================================================


export async function PATCH(
    request: Request,
    { params }: Params,
) {

    try {

        // =========================================
        // Permission
        // =========================================

        const session =
            await requirePermission(
                "users.update",
            )


        // =========================================
        // Target user
        // =========================================

        const { id } = await params


        if (id === session.user.id) {

            return NextResponse.json(
                {
                    error:
                        "You cannot manage your own account here.",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================================
        // Current user
        // =========================================

        const currentUser =
            await centralDb
                .select({
                    schoolId: user.schoolId,
                    schoolRole: user.schoolRole,
                    provisioningStatus: user.provisioningStatus,
                    email: user.email,
                })
                .from(user)
                .where(
                    eq(
                        user.id,
                        session.user.id,
                    ),
                )
                .limit(1)


        if (!currentUser[0]?.schoolId) {

            return NextResponse.json(
                {
                    error:
                        "User is not assigned to a school.",
                },
                {
                    status: 403,
                },
            )
        }


        const schoolId =
            currentUser[0].schoolId


        const currentRole =
            currentUser[0].schoolRole


        // =========================================
        // Target user
        // =========================================

        const targetUser =
            await centralDb
                .select({
                    id: user.id,
                    schoolId: user.schoolId,
                    schoolRole: user.schoolRole,
                    provisioningStatus: user.provisioningStatus,
                })
                .from(user)
                .where(
                    and(
                        eq(
                            user.id,
                            id,
                        ),
                        eq(
                            user.schoolId,
                            schoolId,
                        ),
                    ),
                )
                .limit(1)


        if (!targetUser[0]) {

            return NextResponse.json(
                {
                    error:
                        "User not found.",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================================
        // Read body
        // =========================================

        const body =
            await request.json()


        // =========================================
        // Central DB updates
        // =========================================

        const centralUpdates: {
            schoolRole?: string
            banned?: boolean
            phone?: string | null
        } = {}


        // =========================================
        // Role
        // =========================================

        if (
            body.schoolRole !== undefined
        ) {

            const allowedRoles = [
                "principal",
                "deputy",
                "head_of_class",
                "head_of_department",
                "teacher",
            ]


            if (
                !allowedRoles.includes(
                    body.schoolRole,
                )
            ) {

                return NextResponse.json(
                    {
                        error:
                            "Invalid school role.",
                    },
                    {
                        status: 400,
                    },
                )
            }


            // The deputy may assign only non-administrative staff roles.
            if (currentRole !== "principal" && (currentRole !== "deputy" || body.schoolRole === "deputy" || body.schoolRole === "principal")) {
                return NextResponse.json({ error: "You are not allowed to assign this role." }, { status: 403 })
            }


            // Deputy cannot change the principal
            if (
                currentRole === "deputy" &&
                targetUser[0].schoolRole ===
                    "principal"
            ) {

                return NextResponse.json(
                    {
                        error:
                            "Deputy cannot modify the principal account.",
                    },
                    {
                        status: 403,
                    },
                )
            }


            centralUpdates.schoolRole =
                body.schoolRole
        }


        // =========================================
        // Account status
        // =========================================

        if (
            body.banned !== undefined
        ) {

            if (
                typeof body.banned !==
                "boolean"
            ) {

                return NextResponse.json(
                    {
                        error:
                            "Invalid account status.",
                    },
                    {
                        status: 400,
                    },
                )
            }


            if (
                currentRole === "deputy" &&
                targetUser[0].schoolRole ===
                    "principal"
            ) {

                return NextResponse.json(
                    {
                        error:
                            "Deputy cannot modify the principal account.",
                    },
                    {
                        status: 403,
                    },
                )
            }


            if (body.banned === false && targetUser[0].provisioningStatus !== "active") {
                return NextResponse.json({ error: "Cannot enable an account whose school profile provisioning is incomplete." }, { status: 409 })
            }

            centralUpdates.banned =
                body.banned
        }


        // =========================================
        // Staff profile
        // =========================================

        const profileUpdates: {
            phone?: string | null
            dateOfBirth?: string | null
            address?: string | null
            qualification?: string | null
            employmentDate?: string | null
            specialization?: string | null
            emergencyContactName?: string | null
            emergencyContactPhone?: string | null
        } = {}


        const profileFields = [
            "phone",
            "dateOfBirth",
            "address",
            "qualification",
            "employmentDate",
            "specialization",
            "emergencyContactName",
            "emergencyContactPhone",
        ] as const


        for (
            const field of profileFields
        ) {

            if (
                body[field] !== undefined
            ) {

                if (
                    body[field] !== null &&
                    typeof body[field] !== "string"
                ) {

                    return NextResponse.json(
                        {
                            error:
                                `Invalid ${field}.`,
                        },
                        {
                            status: 400,
                        },
                    )
                }


                profileUpdates[field] =
                    typeof body[field] ===
                        "string"
                        ? body[field].trim() ||
                          null
                        : null
                if (field === "phone") centralUpdates.phone = profileUpdates[field] ?? null
            }
        }


        // =========================================
        // Nothing to update
        // =========================================

        if (
            Object.keys(
                centralUpdates,
            ).length === 0 &&
            Object.keys(
                profileUpdates,
            ).length === 0
        ) {

            return NextResponse.json(
                {
                    error:
                        "No changes provided.",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================================
        // Update Central DB
        // =========================================

        let updatedUser = null


        if (
            Object.keys(
                centralUpdates,
            ).length > 0
        ) {

            const result =
                await centralDb
                    .update(user)
                    .set(centralUpdates)
                    .where(
                        and(
                            eq(
                                user.id,
                                id,
                            ),
                            eq(
                                user.schoolId,
                                schoolId,
                            ),
                        ),
                    )
                    .returning({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        schoolRole:
                            user.schoolRole,
                        banned:
                            user.banned,
                    })


            updatedUser = result[0] ?? null

            if (centralUpdates.banned === true) {
                await centralDb.delete(centralSession).where(eq(centralSession.userId, id))
            }
            const action = centralUpdates.banned === true ? "account_disabled" : centralUpdates.banned === false ? "account_enabled" : centralUpdates.schoolRole ? "account_role_changed" : "account_updated"
            await auditAccountAction({ schoolId, actorUserId: session.user.id, targetUserId: id, action })
        }


        // =========================================
        // Update School DB
        // =========================================

        if (
            Object.keys(
                profileUpdates,
            ).length > 0
        ) {

            const schoolDb =
                await getSchoolDB()


            const existingProfile =
                await schoolDb
                    .select({
                        id:
                            staffProfiles.id,
                    })
                    .from(staffProfiles)
                    .where(
                        eq(
                            staffProfiles.userId,
                            id,
                        ),
                    )
                    .limit(1)


            if (existingProfile[0]) {

                await schoolDb
                    .update(staffProfiles)
                    .set(profileUpdates)
                    .where(
                        eq(
                            staffProfiles.userId,
                            id,
                        ),
                    )

            } else {

                await schoolDb
                    .insert(staffProfiles)
                    .values({
                        userId: id,
                        ...profileUpdates,
                    })
            }
        }


        // =========================================
        // Response
        // =========================================

        return NextResponse.json({
            success: true,
            user: updatedUser,
        })

    } catch (error) {

        console.error(
            "PATCH /api/settings/users/[id] failed:",
            error,
        )


        return NextResponse.json(
            {
                error:
                    "Failed to update user.",
            },
            {
                status: 500,
            },
        )
    }
}



// =====================================================
// DELETE
// Delete user
// =====================================================


export async function DELETE(
    request: Request,
    { params }: Params,
) {

    try {

        // =========================================
        // Permission
        // =========================================

        const session =
            await requirePermission(
                "users.delete",
            )


        // =========================================
        // Target user
        // =========================================

        const { id } = await params


        // =========================================
        // Prevent deleting yourself
        // =========================================

        if (id === session.user.id) {

            return NextResponse.json(
                {
                    error:
                        "You cannot delete your own account.",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================================
        // Current user's school
        // =========================================

        const currentUser =
            await centralDb
                .select({
                    schoolId: user.schoolId,
                    schoolRole: user.schoolRole,
                })
                .from(user)
                .where(
                    eq(
                        user.id,
                        session.user.id,
                    ),
                )
                .limit(1)


        if (!currentUser[0]?.schoolId) {

            return NextResponse.json(
                {
                    error:
                        "User is not assigned to a school.",
                },
                {
                    status: 403,
                },
            )
        }


        const schoolId =
            currentUser[0].schoolId


        // =========================================
        // Target user
        // =========================================

        const targetUser =
            await centralDb
                .select({
                    id: user.id,
                    schoolId: user.schoolId,
                    schoolRole: user.schoolRole,
                })
                .from(user)
                .where(
                    and(
                        eq(
                            user.id,
                            id,
                        ),
                        eq(
                            user.schoolId,
                            schoolId,
                        ),
                    ),
                )
                .limit(1)


        if (!targetUser[0]) {

            return NextResponse.json(
                {
                    error:
                        "User not found.",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================================
        // Deputy protection
        // =========================================

        if (
            currentUser[0].schoolRole ===
                "deputy" &&
            targetUser[0].schoolRole ===
                "principal"
        ) {

            return NextResponse.json(
                {
                    error:
                        "Deputy cannot delete the principal account.",
                },
                {
                    status: 403,
                },
            )
        }


        // Disable rather than hard-delete cross-database identities. Staff assignments,
        // student links and academic audit history remain intact and can be repaired.
        await centralDb.update(user).set({ banned: true })
            .where(and(eq(user.id, id), eq(user.schoolId, schoolId)))
        await centralDb.delete(centralSession).where(eq(centralSession.userId, id))
        await auditAccountAction({ schoolId, actorUserId: session.user.id, targetUserId: id, action: "account_disabled_by_delete_action" })

        // =========================================
        // Response
        // =========================================

        return NextResponse.json({
            success: true,
            disabled: true,
            message: "Account disabled. School records and relationships were preserved.",
        })

    } catch (error) {

        console.error(
            "DELETE /api/settings/users/[id] failed:",
            error,
        )


        return NextResponse.json(
            {
                error:
                    "Failed to delete user.",
            },
            {
                status: 500,
            },
        )
    }
}





// Request a verified password-reset link. No temporary password is generated or returned here.
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requirePermission("users.update")
    const { id } = await params
    const [actor] = await centralDb.select({ schoolId: user.schoolId, schoolRole: user.schoolRole })
      .from(user).where(eq(user.id, session.user.id)).limit(1)
    const [target] = await centralDb.select({ id: user.id, email: user.email, schoolId: user.schoolId, schoolRole: user.schoolRole, provisioningStatus: user.provisioningStatus, mustChangePassword: user.mustChangePassword, emailVerified: user.emailVerified })
      .from(user).where(and(eq(user.id, id), eq(user.schoolId, actor?.schoolId ?? -1))).limit(1)
    if (!actor || !target) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (target.id === session.user.id) return NextResponse.json({ error: "Use the self-service password reset flow for your own account" }, { status: 400 })
    if (actor.schoolRole === "deputy" && ["principal", "deputy"].includes(target.schoolRole)) return NextResponse.json({ error: "You are not allowed to reset this account" }, { status: 403 })
    if (target.provisioningStatus !== "active") return NextResponse.json({ error: "This account's school profile is not fully provisioned" }, { status: 409 })
    if (!isEmailDeliveryConfigured()) return NextResponse.json({ error: "Password-reset email is unavailable because RESEND_API_KEY and EMAIL_FROM are not configured" }, { status: 503 })

    await centralDb.update(user).set({ mustChangePassword: true }).where(eq(user.id, target.id))
    await centralDb.delete(centralSession).where(eq(centralSession.userId, target.id))
    try {
      await auth.api.requestPasswordReset({ body: { email: target.email, redirectTo: `${process.env.BETTER_AUTH_URL ?? ""}/reset-password` }, headers: request.headers })
      if (!target.emailVerified) {
        const verification = await requestAccountEmailVerification(target.email)
        if (verification !== "sent") throw new Error("Email verification could not be sent")
      }
    } catch (error) {
      await centralDb.update(user).set({ mustChangePassword: target.mustChangePassword }).where(eq(user.id, target.id))
      throw error
    }
    await auditAccountAction({ schoolId: actor.schoolId, actorUserId: session.user.id, targetUserId: target.id, action: "password_reset_requested" })
    return NextResponse.json({ success: true, message: "If the email provider accepted the request, a one-time password-reset link has been sent to the account email." })
  } catch (error) {
    console.error("POST password reset request failed", { errorType: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "Password reset could not be requested. Check email-provider configuration." }, { status: 503 })
  }
}
