"use client"
import { useState, type FormEvent } from "react"
import Link from "next/link"

export default function NewUserPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [schoolRole, setSchoolRole] = useState("teacher")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [credentials, setCredentials] = useState<{ name: string; email: string; password: string; emailVerification: string } | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setCredentials(null)
    setSaving(true)
    try {
      const response = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, schoolRole }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Failed to create user")
      if (!result.initialPassword) throw new Error("Account created but initial credentials were not returned. Contact the administrator before retrying.")
      setCredentials({ name: result.user.name, email: result.user.email, password: result.initialPassword, emailVerification: result.emailVerification ?? "not_configured" })
      setName("")
      setEmail("")
      setPhone("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return <main className="min-h-dvh bg-slate-50 p-4 sm:p-6 dark:bg-slate-950"><div className="mx-auto w-full max-w-3xl">
    <Link href="/settings/users" className="text-sm text-slate-500 hover:text-slate-900">← Back to Users</Link>
    <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Add Staff User</h1>
    <p className="mt-1 text-sm text-slate-500">Create an account linked to a school staff profile.</p>
    <form onSubmit={handleSubmit} className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-4 sm:p-6"><h2 className="text-lg font-semibold">Account information</h2><p className="mt-1 text-sm text-slate-500">A unique temporary password is generated securely by the server.</p></div>
      <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
        <label className="text-sm font-medium">Full name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label>
        <label className="text-sm font-medium">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label>
        <label className="text-sm font-medium">Phone (optional)<input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></label>
        <label className="text-sm font-medium">Role<select value={schoolRole} onChange={(e) => setSchoolRole(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="teacher">Teacher</option><option value="head_of_class">Head of class</option><option value="head_of_department">Head of department</option><option value="deputy">Deputy</option></select></label>
      </div>
      {error && <p role="alert" className="mx-4 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-6">{error}</p>}
      <div className="border-t border-slate-200 p-4 sm:p-6"><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white disabled:opacity-60">{saving ? "Creating…" : "Create account"}</button></div>
    </form>
    {credentials && <section className="mt-5 space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><h2 className="font-semibold">Initial credentials — shown once</h2><p>{credentials.name} · {credentials.email}</p><p className="break-all"><strong>Temporary password:</strong> {credentials.password}</p><p>The account must change this password before accessing school data. Copy and deliver the credentials securely; they cannot be retrieved from this page again.</p><p>{credentials.emailVerification === "sent" ? "Verification email request accepted by provider." : credentials.emailVerification === "failed" ? "Email verification failed; retry from user management after checking email settings." : "Email delivery is not configured; the address remains unverified. Phone numbers are not verified by this system."}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.password}`)} className="rounded-md border border-amber-500 px-3 py-2 font-medium">Copy credentials</button><Link href="/settings/users" className="rounded-md bg-amber-900 px-3 py-2 font-medium text-white">Return to users</Link></div></section>}
  </div></main>
}
