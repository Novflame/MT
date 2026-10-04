
import { NextResponse } from "next/server"
import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { schools } from "@/db/centeral-schema"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schoolSchema from "@/db/schema"
import path from "node:path"
import { seedDepartments, seedActiveAcademicYear } from "@/db/seed"
import fs from "node:fs"
import { eq } from "drizzle-orm"
import { runSchoolMigrations } from "@/db/runtime-migrations"
export async function POST(request: Request) {
 


    let schoolId: number | null = null
    let userId: string | null = null
    let schoolDbPath: string | null = null

    try {
        const body = await request.json()

        const {
            name,
            slug,
            principalName,
            principalEmail,
            password,
        } = body

        if (
            !name ||
            !slug ||
            !principalName ||
            !principalEmail ||
            !password
        ) {
            return NextResponse.json(
                {
                    error: "All fields are required",
                },
                {
                    status: 400,
                },
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                {
                    error: "Password must be at least 8 characters",
                },
                {
                    status: 400,
                },
            )
        }

        const normalizedSlug = slug
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")

        const [school] = await centralDb
            .insert(schools)
            .values({
                name: name.trim(),
                slug: normalizedSlug,
            })
            .returning()

        schoolId = school.id

        const dbFolder = path.join(
            process.cwd(),
            "databases",
        )

        if (!fs.existsSync(dbFolder)) {
            fs.mkdirSync(dbFolder, {
                recursive: true,
            })
        }

        schoolDbPath = path.join(
            dbFolder,
            `school_${school.id}.db`,
        )

        const schoolSqlite = new Database(schoolDbPath)

        try {
            const schoolDb = drizzle(schoolSqlite, {
                schema: schoolSchema,
            })


            runSchoolMigrations(
                schoolSqlite,
               
            )


            await seedDepartments(schoolDb)

            await seedActiveAcademicYear(schoolDb)

        } finally {
            schoolSqlite.close()
        }




        const result = await auth.api.signUpEmail({
            body: {
                name: principalName,
                email: principalEmail,
                password,
                schoolId,
                schoolRole: "principal",
            },
            headers: {
                "x-internal-registration-secret":
                    process.env.INTERNAL_REGISTRATION_SECRET!,
            },
        })

        userId = result.user.id




        return NextResponse.json(
            {
                success: true,

                school: {
                    id: school.id,
                    name: school.name,
                    slug: school.slug,
                },

                principal: {
                    id: result.user.id,
                    name: result.user.name,
                    email: result.user.email,
                },
            },
            {
                status: 201,
            },
        )
    } catch (error) {
        console.error(error)

        if (userId) {
            try {
                const { user } = await import("@/db/centeral-schema")

                await centralDb
                    .delete(user)
                    .where(eq(user.id, userId))
            } catch (cleanupError) {
                console.error(
                    "Failed to cleanup user:",
                    cleanupError,
                )
            }
        }

        if (schoolId) {
            try {
                await centralDb
                    .delete(schools)
                    .where(eq(schools.id, schoolId))
            } catch (cleanupError) {
                console.error(
                    "Failed to cleanup school:",
                    cleanupError,
                )
            }
        }

        if (
            schoolDbPath &&
            fs.existsSync(schoolDbPath)
        ) {
            try {
                fs.unlinkSync(schoolDbPath)
            } catch (cleanupError) {
                console.error(
                    "Failed to cleanup school database:",
                    cleanupError,
                )
            }
        }

        return NextResponse.json(
            {
                error: "School registration failed",
            },
            {
                status: 500,
            },
        )
    }


}
