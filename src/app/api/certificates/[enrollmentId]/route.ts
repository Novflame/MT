import { NextResponse } from "next/server"

import { requirePermission } from "@/auth/session"
import { getCertificate } from "@/certificates/get-certificate"


export async function GET(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            enrollmentId: string
        }>
    },
) {

    try {

        const session =
            await requirePermission(
                "results.read",
            )


        const {
            enrollmentId,
        } = await params


        if (!enrollmentId) {

            return NextResponse.json(
                {
                    error:
                        "Enrollment ID is required",
                },
                {
                    status: 400,
                },
            )
        }


        const certificate =
            await getCertificate(
                enrollmentId,
                session,
            )


        return NextResponse.json(
            certificate,
        )

    } catch (error) {

        console.error(
            "Certificate generation error:",
            error,
        )


        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate certificate",
            },
            {
                status: 500,
            },
        )

    }

}