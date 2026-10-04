
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import { staffProfiles } from "@/db/schema"

import { requirePermission } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"


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


            // Deputy cannot create another principal
            if (
                currentRole === "deputy" &&
                body.schoolRole === "principal"
            ) {

                return NextResponse.json(
                    {
                        error:
                            "Deputy cannot assign the principal role.",
                    },
                    {
                        status: 403,
                    },
                )
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


            updatedUser =
                result[0] ?? null
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


        // =========================================
        // Delete staff profile
        // =========================================

        const schoolDb =
            await getSchoolDB()


        await schoolDb
            .delete(staffProfiles)
            .where(
                eq(
                    staffProfiles.userId,
                    id,
                ),
            )


        // =========================================
        // Delete central user
        // =========================================

        const deletedUser =
            await centralDb
                .delete(user)
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
                })


        if (!deletedUser[0]) {

            return NextResponse.json(
                {
                    error:
                        "User could not be deleted.",
                },
                {
                    status: 404,
                },
            )
        }


        // =========================================
        // Response
        // =========================================

        return NextResponse.json({
            success: true,
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



