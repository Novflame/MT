
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { requirePermission } from "@/auth/session"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"
import { staffProfiles } from "@/db/schema"


type Params = {
    params: Promise<{
        userId: string
    }>
}


// =====================================================
// GET
// Get staff profile
// =====================================================

export async function GET(
    request: Request,
    { params }: Params,
) {

    try {

        const session =
            await requirePermission(
                "users.read",
            )

        const { userId } =
            await params


        // =========================================
        // Get current user's school
        // =========================================

        const currentUser =
            await centralDb
                .select({
                    schoolId: user.schoolId,
                })
                .from(user)
                .where(
                    eq(
                        user.id,
                        session.user.id,
                    ),
                )
                .limit(1)


        const schoolId =
            currentUser[0]?.schoolId


        if (!schoolId) {

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


        // =========================================
        // Make sure target user belongs to school
        // =========================================

        const targetUser =
            await centralDb
                .select({
                    id: user.id,
                })
                .from(user)
                .where(
                    and(
                        eq(
                            user.id,
                            userId,
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
        // School database
        // =========================================

        const db =
            await getSchoolDB()


        // =========================================
        // Get profile
        // =========================================

        const profile =
            await db
                .select()
                .from(staffProfiles)
                .where(
                    eq(
                        staffProfiles.userId,
                        userId,
                    ),
                )
                .limit(1)


        return NextResponse.json({
            profile: profile[0] ?? null,
        })

    } catch (error) {

        console.error(
            "GET /api/staff-profile/[userId] failed:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to load staff profile.",
            },
            {
                status: 500,
            },
        )
    }
}


// =====================================================
// PATCH
// Create or update staff profile
// =====================================================

export async function PATCH(
    request: Request,
    { params }: Params,
) {

    try {

        const session =
            await requirePermission(
                "users.update",
            )

        const { userId } =
            await params


        // =========================================
        // Get current user's school
        // =========================================

        const currentUser =
            await centralDb
                .select({
                    schoolId: user.schoolId,
                })
                .from(user)
                .where(
                    eq(
                        user.id,
                        session.user.id,
                    ),
                )
                .limit(1)


        const schoolId =
            currentUser[0]?.schoolId


        if (!schoolId) {

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


        // =========================================
        // Make sure target user belongs to school
        // =========================================

        const targetUser =
            await centralDb
                .select({
                    id: user.id,
                })
                .from(user)
                .where(
                    and(
                        eq(
                            user.id,
                            userId,
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
        // Validate strings
        // =========================================

        const phone =
            typeof body.phone === "string"
                ? body.phone.trim()
                : null

        const profileImage =
            typeof body.profileImage === "string"
                ? body.profileImage.trim()
                : null

        const dateOfBirth =
            typeof body.dateOfBirth === "string"
                ? body.dateOfBirth.trim()
                : null

        const address =
            typeof body.address === "string"
                ? body.address.trim()
                : null

        const qualification =
            typeof body.qualification === "string"
                ? body.qualification.trim()
                : null

        const employmentDate =
            typeof body.employmentDate === "string"
                ? body.employmentDate.trim()
                : null

        const specialization =
            typeof body.specialization === "string"
                ? body.specialization.trim()
                : null

        const emergencyContactName =
            typeof body.emergencyContactName === "string"
                ? body.emergencyContactName.trim()
                : null

        const emergencyContactPhone =
            typeof body.emergencyContactPhone === "string"
                ? body.emergencyContactPhone.trim()
                : null


        // =========================================
        // School database
        // =========================================

        const db =
            await getSchoolDB()


        // =========================================
        // Check existing profile
        // =========================================

        const existingProfile =
            await db
                .select({
                    id: staffProfiles.id,
                })
                .from(staffProfiles)
                .where(
                    eq(
                        staffProfiles.userId,
                        userId,
                    ),
                )
                .limit(1)


        // =========================================
        // Update existing profile
        // =========================================

        if (existingProfile[0]) {

            const updatedProfile =
                await db
                    .update(staffProfiles)
                    .set({
                        phone,
                        profileImage,
                        dateOfBirth,
                        address,
                        qualification,
                        employmentDate,
                        specialization,
                        emergencyContactName,
                        emergencyContactPhone,
                        updatedAt:
                            new Date().toISOString(),
                    })
                    .where(
                        eq(
                            staffProfiles.userId,
                            userId,
                        ),
                    )
                    .returning()


            return NextResponse.json({
                profile:
                    updatedProfile[0],
            })
        }


        // =========================================
        // Create profile
        // =========================================

        const newProfile =
            await db
                .insert(staffProfiles)
                .values({
                    userId,

                    phone,
                    profileImage,
                    dateOfBirth,
                    address,
                    qualification,
                    employmentDate,
                    specialization,
                    emergencyContactName,
                    emergencyContactPhone,
                })
                .returning()


        return NextResponse.json(
            {
                profile:
                    newProfile[0],
            },
            {
                status: 201,
            },
        )

    } catch (error) {

        console.error(
            "PATCH /api/staff-profile/[userId] failed:",
            error,
        )

        return NextResponse.json(
            {
                error:
                    "Failed to save staff profile.",
            },
            {
                status: 500,
            },
        )
    }
}

