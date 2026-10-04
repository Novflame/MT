import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { getSchoolDB } from "@/db"
import {
    coreSubjects,
    subjects,
} from "@/db/schema"

import { requirePermission } from "@/auth/session"


// =====================================================
// GET
// /api/core-subjects?academicYearId=...&classId=...
// =====================================================

export async function GET(request: Request) {
    try {
        await requirePermission("subjects.read")

        const url = new URL(request.url)

        const academicYearId =
            url.searchParams.get("academicYearId")

        const classId =
            url.searchParams.get("classId")

        if (!academicYearId || !classId) {
            return NextResponse.json(
                {
                    error:
                        "academicYearId and classId are required",
                },
                { status: 400 },
            )
        }

        const db = await getSchoolDB()

        const rows =
            await db.query.coreSubjects.findMany({
                where: and(
                    eq(
                        coreSubjects.academicYearId,
                        academicYearId,
                    ),
                    eq(
                        coreSubjects.classId,
                        classId,
                    ),
                ),
                with: {
                    // لا توجد relation للـ subject حاليًا
                    // لذلك سنجلب الـ subjects بالـ IDs لاحقًا
                },
            })

        return NextResponse.json({
            success: true,
            subjectIds: rows.map(
                (row) => row.subjectId,
            ),
        })
    } catch (error) {
        console.error(
            "GET CORE SUBJECTS ERROR:",
            error,
        )

        if (
            error instanceof Error &&
            error.message === "Forbidden"
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            )
        }

        return NextResponse.json(
            {
                error:
                    "Failed to get core subjects",
            },
            { status: 500 },
        )
    }
}


// =====================================================
// POST
// Sync core subjects
// =====================================================

export async function POST(request: Request) {
    try {
        await requirePermission("subjects.update")

        const body = await request.json()

        const academicYearId =
            typeof body.academicYearId === "string"
                ? body.academicYearId.trim()
                : ""

        const classId =
            typeof body.classId === "string"
                ? body.classId.trim()
                : ""

        const subjectIds:string[] =
            Array.isArray(body.subjectIds)
                ? body.subjectIds.filter(
                    (id: unknown): id is string =>
                        typeof id === "string" &&
                        id.trim().length > 0,
                )
                : []

        if (!academicYearId || !classId) {
            return NextResponse.json(
                {
                    error:
                        "academicYearId and classId are required",
                },
                { status: 400 },
            )
        }

        const db = await getSchoolDB()

        // ---------------------------------------------
        // Make sure selected subjects actually exist
        // ---------------------------------------------

        const uniqueSubjectIds = [
            ...new Set(subjectIds),
        ]

        for (const subjectId of uniqueSubjectIds) {
            const subject =
                await db.query.subjects.findFirst({
                    where: eq(
                        subjects.id,
                        subjectId,
                    ),
                })

            if (!subject) {
                return NextResponse.json(
                    {
                        error:
                            `Subject not found: ${subjectId}`,
                    },
                    { status: 404 },
                )
            }
        }

        // ---------------------------------------------
        // Remove current core subjects
        // ---------------------------------------------

        await db
            .delete(coreSubjects)
            .where(
                and(
                    eq(
                        coreSubjects.academicYearId,
                        academicYearId,
                    ),
                    eq(
                        coreSubjects.classId,
                        classId,
                    ),
                ),
            )

        // ---------------------------------------------
        // Insert new selection
        // ---------------------------------------------

        if (uniqueSubjectIds.length > 0) {
            await db
                .insert(coreSubjects)
                .values(
                    uniqueSubjectIds.map(
                        (subjectId) => ({
                            id:
                                crypto.randomUUID(),

                            academicYearId,

                            classId,

                            subjectId,
                        }),
                    ),
                )
        }

        return NextResponse.json({
            success: true,
            subjectIds: uniqueSubjectIds,
        })
    } catch (error) {
        console.error(
            "SAVE CORE SUBJECTS ERROR:",
            error,
        )

        if (
            error instanceof Error &&
            error.message === "Forbidden"
        ) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 },
            )
        }

        return NextResponse.json(
            {
                error:
                    "Failed to save core subjects",
            },
            { status: 500 },
        )
    }
}