import { getRequestSession } from "@/auth/session"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import fs from "node:fs/promises"
import path from "node:path"

import { centralDb } from "@/db/central"
import { schools, user } from "@/db/centeral-schema"
import { hasPermission, type Role } from "@/auth/permissions"


const MAX_FILE_SIZE = 2 * 1024 * 1024

export async function POST(request: Request) {

    try {

        // =========================================
        // Authentication
        // =========================================

        const session = await getRequestSession(request.headers)

        if (!session?.user) {

            return NextResponse.json(
                {
                    error: "Unauthorized",
                },
                {
                    status: 401,
                },
            )
        }


        // Only administrators granted school.update may replace the logo.
        const role = session.user.schoolRole as Role
        if (!hasPermission(role, "school.update")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // =========================================
        // Find user's school
        // =========================================

        const currentUser = await centralDb
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


        if (!currentUser[0]) {

            return NextResponse.json(
                {
                    error: "User not found",
                },
                {
                    status: 404,
                },
            )
        }


        const schoolId =
            currentUser[0].schoolId


        // =========================================
        // Read uploaded file
        // =========================================

        const formData =
            await request.formData()

        const file =
            formData.get("logo")


        if (!(file instanceof File)) {

            return NextResponse.json(
                {
                    error: "Logo file is required",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================================
        // Validate file size
        // =========================================

        if (file.size > MAX_FILE_SIZE) {

            return NextResponse.json(
                {
                    error: "Logo must be smaller than 2 MB",
                },
                {
                    status: 400,
                },
            )
        }


        // Validate the actual file signature; client-provided MIME is not trusted.
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
        const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP"

        if (!isPng && !isJpeg && !isWebp) {
            return NextResponse.json(
                { error: "Only valid PNG, JPEG and WebP images are allowed" },
                { status: 400 },
            )
        }

        const extension = isPng ? "png" : isWebp ? "webp" : "jpg"

        // =========================================
        // Create upload directory
        // =========================================

        const uploadsRoot = process.env.SCHOOL_UPLOADS_DIR?.trim()
            ? path.resolve(process.env.SCHOOL_UPLOADS_DIR)
            : path.join(process.cwd(), "public", "uploads")
        const uploadDirectory = path.join(uploadsRoot, "schools", String(schoolId))


        await fs.mkdir(
            uploadDirectory,
            {
                recursive: true,
            },
        )


        // =========================================
        // File name
        // =========================================

        const fileName =
            `logo.${extension}`


        const filePath =
            path.join(
                uploadDirectory,
                fileName,
            )


        // =========================================
        // Save file
        // =========================================

        await fs.writeFile(
            filePath,
            buffer,
        )


        // =========================================
        // Public URL
        // =========================================

        const logoUrl =
            `/uploads/schools/${schoolId}/${fileName}`


        // =========================================
        // Save URL in database
        // =========================================

        const [updatedSchool] =
            await centralDb
                .update(schools)
                .set({
                    logo: logoUrl,
                })
                .where(
                    eq(
                        schools.id,
                        schoolId,
                    ),
                )
                .returning({
                    id: schools.id,
                    name: schools.name,
                    slug: schools.slug,
                    logo: schools.logo,
                    address: schools.address,
                })


        if (!updatedSchool) {

            return NextResponse.json(
                {
                    error: "School not found",
                },
                {
                    status: 404,
                },
            )
        }


        return NextResponse.json({
            success: true,
            school: updatedSchool,
        })


    } catch (error) {

        console.error(
            "POST /api/school/logo failed:",
            error,
        )

        return NextResponse.json(
            {
                error: "Failed to upload logo",
            },
            {
                status: 500,
            },
        )
    }
}
