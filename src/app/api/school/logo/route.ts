import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import fs from "node:fs/promises"
import path from "node:path"

import { auth } from "@/auth/auth"
import { centralDb } from "@/db/central"
import { schools, user } from "@/db/centeral-schema"


const MAX_FILE_SIZE = 2 * 1024 * 1024

const ALLOWED_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
]


export async function POST(request: Request) {

    try {

        // =========================================
        // Authentication
        // =========================================

        const session = await auth.api.getSession({
            headers: request.headers,
        })

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


        // =========================================
        // Validate file type
        // =========================================

        if (!ALLOWED_TYPES.includes(file.type)) {

            return NextResponse.json(
                {
                    error:
                        "Only PNG, JPG and WebP images are allowed",
                },
                {
                    status: 400,
                },
            )
        }


        // =========================================
        // File extension
        // =========================================

        const extension =
            file.type === "image/png"
                ? "png"
                : file.type === "image/webp"
                    ? "webp"
                    : "jpg"


        // =========================================
        // Create upload directory
        // =========================================

        const uploadDirectory =
            path.join(
                process.cwd(),
                "public",
                "uploads",
                "schools",
                String(schoolId),
            )


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

        const bytes =
            await file.arrayBuffer()

        const buffer =
            Buffer.from(bytes)

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