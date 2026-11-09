"use client"
import { FormEvent, Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { authClient } from "@/auth/auth-client"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!token) return setError("The reset link is missing its token. Request a new link.")
    if (password.length < 12) return setError("Use at least 12 characters.")
    if (password !== confirm) return setError("The passwords do not match.")
    setBusy(true)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) throw new Error(result.error.message || "Reset failed")
      setDone(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reset failed. Request a new link.")
    } finally { setBusy(false) }
  }

  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 text-slate-900"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h1 className="text-2xl font-semibold">Reset password</h1>{done ? <><p className="text-sm text-green-700">Your password was reset. You can now sign in.</p><button type="button" onClick={() => router.replace("/login")} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-white">Go to sign in</button></> : <><label className="block text-sm font-medium">New password<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="block text-sm font-medium">Confirm password<input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-white disabled:opacity-60">{busy ? "Saving…" : "Reset password"}</button></>}</form></main>
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="flex min-h-dvh items-center justify-center">Loading reset form…</main>}><ResetPasswordForm /></Suspense>
}
