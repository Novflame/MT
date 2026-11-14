import { NextResponse } from "next/server"
import { auth } from "@/auth/auth"
import { isEmailDeliveryConfigured } from "@/lib/email"

export async function POST(request: Request) {
  if (!isEmailDeliveryConfigured()) {
    return NextResponse.json({ error: "Password reset by email is not configured. The administrator must set BETTER_AUTH_URL, RESEND_API_KEY and EMAIL_FROM." }, { status: 503 })
  }
  try {
    const body = await request.json() as Record<string, unknown>
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${process.env.BETTER_AUTH_URL ?? ""}/reset-password` },
      headers: request.headers,
    })
    return NextResponse.json({ success: true, message: "If this email belongs to an account, a reset link will be sent when the provider accepts the request." })
  } catch (error) {
    console.error("Password reset request failed", { errorType: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "The email provider could not accept the password-reset request. Try again later." }, { status: 503 })
  }
}
