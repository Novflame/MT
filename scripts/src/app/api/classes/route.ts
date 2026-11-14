import { NextResponse } from "next/server"
import { getSchoolDB } from "@/db"
import { schoolClases } from "@/db/schema"
import { requirePermission } from "@/auth/session"

export async function GET() {
    try {
        await requirePermission("classes.read")

        const db = await getSchoolDB()

        const classes = await db.query.schoolClases.findMany()

        return NextResponse.json(classes)
    } catch (error) {
        console.error(error)

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
            { error: "Failed to get classes" },
            { status: 500 },
        )
    }
}

export async function POST(request: Request) {
    try {
        await requirePermission("classes.create")

        const body = await request.json()

        const {
            name,
            gradeLevel,
        } = body

        if (!name || gradeLevel === undefined) {
            return NextResponse.json(
                {
                    error: "All fields are required",
                },
                {
                    status: 400,
                },
            )
        }

        const db = await getSchoolDB()

        const newClass = await db
            .insert(schoolClases)
            .values({
                id: globalThis.crypto.randomUUID(),
                name,
                gradeLevel,
            })
            .returning()

        return NextResponse.json(
            {
                success: true,
                data: newClass,
            },
            {
                status: 201,
            },
        )
    } catch (error) {
        console.error(error)

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
                error: "Failed to add class",
            },
            {
                status: 500,
            },
        )
    }
}
