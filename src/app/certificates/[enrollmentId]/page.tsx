import { notFound } from "next/navigation"

import { requirePermission } from "@/auth/session"
import { getCertificate } from "@/certificates/get-certificate"

import CertificateClient from "./CertificateClient"


type CertificatePageProps = {
    params: Promise<{
        enrollmentId: string
    }>
}


export default async function CertificatePage({
    params,
}: CertificatePageProps) {

    // ============================================================
    // AUTHENTICATION + AUTHORIZATION
    // ============================================================

    const session =
        await requirePermission(
            "results.read",
        )


    // ============================================================
    // ROUTE PARAMETER
    // ============================================================

    const {
        enrollmentId,
    } = await params


    if (!enrollmentId) {
        notFound()
    }


    // ============================================================
    // GET CERTIFICATE
    // ============================================================

    let certificate

    try {

        certificate =
            await getCertificate(
                enrollmentId,
                session,
            )

    } catch (error) {

        console.error(
            "Certificate page error:",
            error,
        )

        notFound()
    }


    // ============================================================
    // CLIENT UI
    // ============================================================

    return (
        <CertificateClient
            certificate={certificate}
        />
    )
}