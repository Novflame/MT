
import { NextResponse } from "next/server"
import { getSchoolDB } from "@/db"
import { subjects } from "@/db/schema"
import { requirePermission } from "@/auth/session"
import { eq } from "drizzle-orm"
export async function GET() {
    try {
        await requirePermission("subjects.read")

        const db = await getSchoolDB()

        const data = await db.query.subjects.findMany({
    with: {
        department: true,
    },
})

        return NextResponse.json(data)
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
                error: "Failed to get subjects",
            },
            {
                status: 500,
            },
        )
    }
}



export async function POST(request: Request) {
    try {
        await requirePermission("subjects.create")

        const body = await request.json()

        const name = body.name?.trim()
        const departmentId = body.departmentId?.trim()

        if (!name || !departmentId) {
            return NextResponse.json(
                {
                    error: "Subject name and department are required",
                },
                {
                    status: 400,
                },
            )
        }

        const db = await getSchoolDB()

        const department =
            await db.query.departments.findFirst({
                where: (departments, { eq }) =>
                    eq(
                        departments.id,
                        departmentId,
                    ),
            })

        if (!department) {
            return NextResponse.json(
                {
                    error: "Department not found",
                },
                {
                    status: 404,
                },
            )
        }

        const [subject] = await db
            .insert(subjects)
            .values({
                id: crypto.randomUUID(),
                name,
                departmentId,
            })
            .returning()

        return NextResponse.json(
            subject,
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
                error: "Failed to create subject",
            },
            {
                status: 500,
            },
        )
    }
}
export async function PATCH(request: Request) {
    try {
        await requirePermission("subjects.update")

        const body = await request.json()

        const id =
            typeof body.id === "string"
                ? body.id.trim()
                : ""

        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : ""

        const departmentId =
            typeof body.departmentId === "string"
                ? body.departmentId.trim()
                : ""

        if (!id || !name || !departmentId) {
            return NextResponse.json(
                {
                    error:
                        "Subject id, name and department are required",
                },
                {
                    status: 400,
                },
            )
        }

        const db = await getSchoolDB()

        const department =
            await db.query.departments.findFirst({
                where: (departments, { eq }) =>
                    eq(
                        departments.id,
                        departmentId,
                    ),
            })

        if (!department) {
            return NextResponse.json(
                {
                    error: "Department not found",
                },
                {
                    status: 404,
                },
            )
        }

        const [subject] = await db
            .update(subjects)
            .set({
                name,
                departmentId,
            })
            .where(eq(subjects.id, id))
            
            .returning()

        if (!subject) {
            return NextResponse.json(
                {
                    error: "Subject not found",
                },
                {
                    status: 404,
                },
            )
        }

        return NextResponse.json(subject)

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
                error: "Failed to update subject",
            },
            {
                status: 500,
            },
        )
    }
}
export async function DELETE(request: Request) {
    try {
        await requirePermission("subjects.delete")

        const body = await request.json()

        const id =
            typeof body.id === "string"
                ? body.id.trim()
                : ""

        if (!id) {
            return NextResponse.json(
                {
                    error: "Subject id is required",
                },
                {
                    status: 400,
                },
            )
        }

        const db = await getSchoolDB()

        const [subject] = await db
            .delete(subjects)
            .where(eq(subjects.id, id))
            .returning()

        if (!subject) {
            return NextResponse.json(
                {
                    error: "Subject not found",
                },
                {
                    status: 404,
                },
            )
        }

        return NextResponse.json({
            success: true,
            subject,
        })

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
                error: "Failed to delete subject",
            },
            {
                status: 500,
            },
        )
    }
}