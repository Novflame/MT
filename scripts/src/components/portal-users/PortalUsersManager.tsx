"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

type StudentOption = { id: string; name: string; userId: string | null }
type ParentOption = { id: string; name: string; phone: string; userId: string | null }
type PortalAccount = { id: string; name: string; email: string; schoolRole: "parent" | "student"; banned: boolean | null; emailVerified: boolean; mustChangePassword: boolean; provisioningStatus: string }

export default function PortalUsersManager({ students, parents, accounts, canRepair }: { students: StudentOption[]; parents: ParentOption[]; accounts: PortalAccount[]; canRepair: boolean }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<"parent" | "student">("parent")
  const [studentId, setStudentId] = useState("")
  const [parentId, setParentId] = useState("")
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [credential, setCredential] = useState<{ name: string; email: string; password: string; emailVerification: string } | null>(null)
  const [notice, setNotice] = useState("")
  const [accountNotice, setAccountNotice] = useState("")
  const [accountError, setAccountError] = useState("")
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null)
  const selectedParent = parents.find((parent) => parent.id === parentId)
  const usingExistingParentAccount = role === "parent" && Boolean(selectedParent?.userId)

  function changeRole(next: "parent" | "student") {
    setRole(next)
    setError("")
    setNotice("")
    setCredential(null)
  }

  async function save() {
    setSaving(true)
    setError("")
    setNotice("")
    setCredential(null)
    try {
      const response = await fetch("/api/portal-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          role,
          parentId: role === "parent" ? parentId || null : null,
          studentId: role === "student" ? studentId : null,
          studentIds: role === "parent" ? studentIds : [],
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create account")
      if (data.linkedExisting) {
        setNotice(`Linked ${data.linkedStudentCount} child record(s) to the existing parent account ${data.user.email}. No duplicate account was created.`)
        setStudentIds([])
        return
      }
      if (!data.initialPassword) throw new Error("Account created but initial credentials were not returned. Contact the administrator before retrying.")
      setCredential({ name: data.user.name, email: data.user.email, password: data.initialPassword, emailVerification: data.emailVerification ?? "not_configured" })
      setName("")
      setEmail("")
      setPhone("")
      setStudentId("")
      setParentId("")
      setStudentIds([])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create account")
    } finally {
      setSaving(false)
    }
  }

  async function manageAccount(account: PortalAccount, action: "disable" | "enable" | "reset" | "verify" | "repair") {
    setAccountNotice("")
    setAccountError("")
    setBusyAccountId(account.id)
    try {
      let url = `/api/settings/users/${account.id}`
      let method = "POST"
      let body: string | undefined
      if (action === "disable") method = "DELETE"
      if (action === "enable") { method = "PATCH"; body = JSON.stringify({ banned: false }) }
      if (action === "verify") url += "/verify-email"
      if (action === "repair") url += "/repair"
      const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Account action failed")
      setAccountNotice(result.message || (action === "disable" ? "Account disabled." : action === "enable" ? "Account enabled." : action === "reset" ? "Password reset requested." : action === "verify" ? "Verification requested." : "Account repaired."))
      router.refresh()
    } catch (caught) {
      setAccountError(caught instanceof Error ? caught.message : "Account action failed")
    } finally { setBusyAccountId(null) }
  }

  return <section className="mt-6 min-w-0 space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Account type<select className="mt-1 w-full rounded-lg border px-3 py-2" value={role} onChange={(e) => changeRole(e.target.value as "parent" | "student")}><option value="parent">Parent</option><option value="student">Student</option></select></label>
      {role === "parent" && <label className="text-sm font-medium">Parent profile<select className="mt-1 w-full rounded-lg border px-3 py-2" value={parentId} onChange={(e) => { const id = e.target.value; setParentId(id); const p = parents.find((item) => item.id === id); setNotice(""); if (p) { setName(p.userId ? "" : p.name); setEmail(""); setPhone(p.phone) } else { setName(""); setPhone(""); setEmail("") } }}><option value="">Create a new parent profile</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name} — {parent.phone}{parent.userId ? " (existing login account)" : " (no login account yet)"}</option>)}</select></label>}
      <label className="text-sm font-medium">Full name<input className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required={!usingExistingParentAccount} disabled={usingExistingParentAccount} /></label>
      <label className="text-sm font-medium">Email address<input className="mt-1 w-full rounded-lg border px-3 py-2" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required={!usingExistingParentAccount} disabled={usingExistingParentAccount} /></label>
      <label className="text-sm font-medium">Phone (optional)<input className="mt-1 w-full rounded-lg border px-3 py-2" type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      {role === "student" ? <label className="text-sm font-medium">Student profile<select className="mt-1 w-full rounded-lg border px-3 py-2" value={studentId} onChange={(e) => { const id = e.target.value; setStudentId(id); const student = students.find((item) => item.id === id); if (student) setName(student.name) }} required><option value="">Select student</option>{students.filter((student) => !student.userId).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label> : <label className="text-sm font-medium sm:col-span-2">Children to link (select one or more)<select multiple className="mt-1 min-h-32 w-full rounded-lg border px-3 py-2" value={studentIds} onChange={(e) => setStudentIds(Array.from(e.target.selectedOptions, (option) => option.value))}>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Existing children may be linked to the selected parent profile. A new parent profile requires at least one child.</span></label>}
    </div>
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {credential && <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm"><p className="font-semibold text-amber-950">Initial credentials — shown once</p><p>Account: {credential.name} ({credential.email})</p><p className="break-all"><span className="font-medium">Temporary password:</span> {credential.password}</p><p className="text-amber-900">Copy and deliver it securely. The account must change this password before accessing school data. This page will not retrieve it again.</p><p className="text-amber-900">{credential.emailVerification === "sent" ? "A verification email request was accepted by the configured provider." : credential.emailVerification === "failed" ? "Email verification could not be sent. The account may be unable to sign in until an administrator retries verification." : "Email delivery is not configured; the email address is not verified. Phone numbers are not verified by this system."}</p><button type="button" onClick={() => navigator.clipboard.writeText(`Email: ${credential.email}\nTemporary password: ${credential.password}`)} className="rounded-md border border-amber-500 px-3 py-1.5 font-medium">Copy credentials</button></div>}
    <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white disabled:opacity-60">{saving ? "Saving…" : usingExistingParentAccount ? "Link children to existing parent account" : "Create portal account"}</button>

    <section className="border-t border-slate-200 pt-5 dark:border-slate-700">
      <h2 className="text-lg font-semibold">Existing student and parent accounts</h2>
      <p className="mt-1 text-sm text-slate-500">Review verification, initial-password status, and access. Disabling an account preserves its school records and links.</p>
      {accountNotice && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{accountNotice}</p>}
      {accountError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{accountError}</p>}
      <div className="mt-3 space-y-3">
        {accounts.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No portal accounts have been created yet.</p>}
        {accounts.map((account) => {
          const disabled = Boolean(account.banned) || account.provisioningStatus !== "active"
          return <article key={account.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">{account.name} <span className="text-xs font-normal text-slate-500">({account.schoolRole})</span></p>
                <p className="break-all text-sm text-slate-600">{account.email}</p>
                <p className="mt-1 text-xs text-slate-500">Access: {disabled ? "Disabled / incomplete" : "Active"} · Email: {account.emailVerified ? "Verified" : "Not verified"} · Initial password: {account.mustChangePassword ? "Change required" : "Complete"} · Provisioning: {account.provisioningStatus}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {account.provisioningStatus === "failed" && canRepair && <button type="button" disabled={busyAccountId === account.id} onClick={() => manageAccount(account, "repair")} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-900 disabled:opacity-50">Repair & send reset</button>}
                {account.provisioningStatus === "active" && (disabled ? <button type="button" disabled={busyAccountId === account.id} onClick={() => manageAccount(account, "enable")} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50">Enable</button> : <button type="button" disabled={busyAccountId === account.id} onClick={() => manageAccount(account, "disable")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 disabled:opacity-50">Disable</button>)}
                {account.provisioningStatus === "active" && <button type="button" disabled={busyAccountId === account.id} onClick={() => manageAccount(account, "reset")} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50">Send password reset</button>}
                {account.provisioningStatus === "active" && !account.emailVerified && <button type="button" disabled={busyAccountId === account.id} onClick={() => manageAccount(account, "verify")} className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50">Resend verification</button>}
              </div>
            </div>
          </article>
        })}
      </div>
    </section>
  </section>
}
