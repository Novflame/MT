import { requirePermission } from "@/auth/session"
import { and, eq, inArray } from "drizzle-orm"
import { centralDb } from "@/db/central"
import { user } from "@/db/centeral-schema"
import { getSchoolDB } from "@/db"
import PortalUsersManager from "@/components/portal-users/PortalUsersManager"
import { getStudentFullName } from "@/lib/student-name"

export default async function PortalUsersPage() {
  const session = await requirePermission("users.create")
  const [actor] = await centralDb.select({ schoolId: user.schoolId, schoolRole: user.schoolRole })
    .from(user).where(eq(user.id, session.user.id)).limit(1)
  if (!actor?.schoolId) throw new Error("Current account is not assigned to a school")
  const db = await getSchoolDB()
  const [students, links, parents] = await Promise.all([
    db.query.students.findMany({ orderBy: (s, { asc }) => asc(s.firstName) }),
    db.query.studentUsers.findMany(),
    db.query.parents.findMany({ orderBy: (p, { asc }) => asc(p.name) }),
  ])
  const linked = new Set(links.map((x) => x.studentId))
  const accountRows = await centralDb.select({
    id: user.id, name: user.name, email: user.email, schoolRole: user.schoolRole, banned: user.banned,
    emailVerified: user.emailVerified, mustChangePassword: user.mustChangePassword, provisioningStatus: user.provisioningStatus,
  }).from(user).where(and(eq(user.schoolId, actor.schoolId), inArray(user.schoolRole, ["parent", "student"])))
  const accounts = accountRows.map((account) => ({ ...account, schoolRole: account.schoolRole as "parent" | "student" }))

  return (
    <main className="min-h-dvh bg-gray-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Portal Accounts</h1>
        <p className="mt-2 text-gray-600">Create parent and student login accounts, reuse existing parent accounts, and review portal-account status.</p>
        <PortalUsersManager
          students={students.map((student) => ({ id: student.id, name: getStudentFullName(student), userId: linked.has(student.id) ? "linked" : null }))}
          parents={parents.map((parent) => ({ id: parent.id, name: parent.name, phone: parent.phone, userId: parent.userId ?? null }))}
          accounts={accounts}
          canRepair={actor.schoolRole === "principal"}
        />
      </div>
    </main>
  )
}
