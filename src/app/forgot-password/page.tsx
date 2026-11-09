"use client"
import { FormEvent, useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    setError("")
    setBusy(true)
    try {
      const response = await fetch("/api/account/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not request password reset")
      setMessage(data.message || "Check your email if an account exists.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request password reset")
    } finally { setBusy(false) }
  }

  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 text-slate-900"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h1 className="text-2xl font-semibold">Forgot password?</h1><p className="text-sm text-slate-600">Enter the email address associated with your school account. A reset link requires configured email delivery.</p><label className="block text-sm font-medium">Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>{message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-white disabled:opacity-60">{busy ? "Requesting…" : "Send reset link"}</button><Link href="/login" className="block text-center text-sm text-blue-700 hover:underline">Back to sign in</Link></form></main>
}
