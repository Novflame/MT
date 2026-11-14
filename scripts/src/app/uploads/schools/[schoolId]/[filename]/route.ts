import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

const ALLOWED_FILES = {
    "logo.png": "image/png",
    "logo.jpg": "image/jpeg",
    "logo.webp": "image/webp",
} as const

type LogoFilename = keyof typeof ALLOWED_FILES

export async function GET(
    _request: Request,
    context: {
        params: Promise<{
            schoolId: string
            filename: string
        }>
    },
) {
    try {
        const { schoolId, filename } = await context.params

        if (!/^[1-9]\d*$/.test(schoolId)) {
            return new NextResponse(null, { status: 404 })
        }

        if (!Object.hasOwn(ALLOWED_FILES, filename)) {
            return new NextResponse(null, { status: 404 })
        }

        const uploadsRoot = process.env.SCHOOL_UPLOADS_DIR?.trim()
            ? path.resolve(process.env.SCHOOL_UPLOADS_DIR)
            : path.join(process.cwd(), "public", "uploads")

        const filePath = path.join(
            uploadsRoot,
            "schools",
            schoolId,
            filename,
        )

        const file = await fs.readFile(filePath)

        return new NextResponse(new Uint8Array(file), {
            status: 200,
            headers: {
                "Content-Type": ALLOWED_FILES[filename as LogoFilename],
                "Cache-Control": "public, max-age=3600, must-revalidate",
                "X-Content-Type-Options": "nosniff",
            },
        })
    } catch (error) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return new NextResponse(null, { status: 404 })
        }

        console.error("GET /uploads/schools/[schoolId]/[filename] failed:", error)

        return new NextResponse(null, { status: 500 })
    }
}