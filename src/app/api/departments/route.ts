import { NextResponse } from "next/server"
import { requirePermission } from "@/auth/session"
import { getSchoolDB } from "@/db"
import { departments } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
    try {
        await requirePermission("departments.read")

        const db = await getSchoolDB()

        const data = await db.query.departments.findMany({
            orderBy: (departments, { asc }) =>
                asc(departments.name),
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
            { error: "Failed to get departments" },
            { status: 500 },
        )
    }
}


export async function POST(request: Request) {
    try {
        await requirePermission("departments.create")

        const body = await request.json()

        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : ""

        if (!name) {
            return NextResponse.json(
                { error: "Department name is required" },
                { status: 400 },
            )
        }

        const db = await getSchoolDB()

        const [department] = await db
            .insert(departments)
            .values({
                id: crypto.randomUUID(),
                name,
            })
            .returning()

        return NextResponse.json(
            department,
            { status: 201 },
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
            { error: "Failed to create department" },
            { status: 500 },
        )
    }
}


export async function PATCH(request: Request) {
    try {
        await requirePermission("departments.update")

        const body = await request.json()

        const id =
            typeof body.id === "string"
                ? body.id.trim()
                : ""

        const name =
            typeof body.name === "string"
                ? body.name.trim()
                : ""

        if (!id || !name) {
            return NextResponse.json(
                { error: "Department id and name are required" },
                { status: 400 },
            )
        }

        const db = await getSchoolDB()

        const [department] = await db
            .update(departments)
            .set({
                name,
            })
            .where(eq(departments.id, id))
            .returning()

        if (!department) {
            return NextResponse.json(
                { error: "Department not found" },
                { status: 404 },
            )
        }

        return NextResponse.json(department)

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
            { error: "Failed to update department" },
            { status: 500 },
        )
    }
}


export async function DELETE(request: Request) {
    try {
        await requirePermission("departments.delete")

        const body = await request.json()

        const id =
            typeof body.id === "string"
                ? body.id.trim()
                : ""

        if (!id) {
            return NextResponse.json(
                { error: "Department id is required" },
                { status: 400 },
            )
        }

        const db = await getSchoolDB()

        // Check if the department exists
        const department =
            await db.query.departments.findFirst({
                where: (departments, { eq }) =>
                    eq(departments.id, id),
            })

        if (!department) {
            return NextResponse.json(
                { error: "Department not found" },
                { status: 404 },
            )
        }

        // Check for subjects belonging to this department
        const subject =
            await db.query.subjects.findFirst({
                where: (subjects, { eq }) =>
                    eq(subjects.departmentId, id),
            })

        if (subject) {
            return NextResponse.json(
                {
                    error:
                        "Cannot delete department because it has subjects",
                },
                { status: 409 },
            )
        }

        await db
            .delete(departments)
            .where(eq(departments.id, id))

        return NextResponse.json({
            success: true,
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
            { error: "Failed to delete department" },
            { status: 500 },
        )
    }
}