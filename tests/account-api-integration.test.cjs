const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const Module = require("node:module")
const ts = require("typescript")

const root = path.resolve(__dirname, "..")

function loadRoute(relativePath, mocks) {
  const filename = path.join(root, relativePath)
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const compiled = new Module(filename, module.parent)
  compiled.filename = filename
  compiled.paths = Module._nodeModulePaths(path.dirname(filename))
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request]
    return originalLoad.call(this, request, parent, isMain)
  }
  try { compiled._compile(output, filename) } finally { Module._load = originalLoad }
  return compiled.exports
}

function nextResponseMock() {
  return { NextResponse: { json: (body, init = {}) => ({ status: init.status ?? 200, body }) } }
}
function dbOpsMock() {
  return { eq: (...args) => ({ op: "eq", args }), and: (...args) => ({ op: "and", args }), isNull: (value) => ({ op: "isNull", value }) }
}
function requestWith(body) { return { json: async () => body, headers: new Headers() } }

test("staff account API rejects deputy escalation before touching the school database", async () => {
  let created = false
  const mocks = {
    "next/server": nextResponseMock(),
    "drizzle-orm": dbOpsMock(),
    "@/db": { getSchoolDB: async () => { throw new Error("must not access school DB") } },
    "@/db/schema": { staffProfiles: {} },
    "@/auth/session": { requirePermission: async () => ({ user: { id: "deputy-1", schoolId: 1, schoolRole: "deputy" } }) },
    "@/db/central": { centralDb: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ schoolId: 1, schoolRole: "deputy" }] }) }) }) } },
    "@/db/centeral-schema": { user: { id: {}, schoolId: {}, schoolRole: {} } },
    "@/auth/account-provisioning": { createProvisionedAccount: async () => { created = true; throw new Error("should not create") }, auditAccountAction: async () => {}, markProvisioningActive: async () => {}, markProvisioningFailed: async () => {}, requestAccountEmailVerification: async () => "not_configured" },
    "@/auth/role-assignment": { canAssignStaffRole: (actor, target) => actor === "principal" || (actor === "deputy" && ["teacher", "head_of_class", "head_of_department"].includes(target)) },
  }
  const route = loadRoute("src/app/api/settings/users/route.ts", mocks)
  const result = await route.POST(requestWith({ name: "Escalation", email: "bad-role@example.test", schoolRole: "deputy" }))
  assert.equal(result.status, 403)
  assert.equal(created, false)
})

test("staff account API links a school profile and returns one-time generated credentials", async () => {
  let profileLinked = false
  let activated = false
  let verificationRequested = false
  let createdForSchoolId = null
  const created = { id: "staff-new", name: "Teacher Example", email: "teacher@example.test", schoolId: 1, schoolRole: "teacher", initialPassword: "one-time-secret", stage: "account_creation", leaseToken: "lease-1" }
  const schoolDb = {
    insert: () => ({ values: (row) => ({ onConflictDoNothing: async () => { profileLinked = row.userId === created.id } }) }),
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ userId: created.id }] }) }) }),
  }
  let centralSelectCount = 0
  const mocks = {
    "next/server": nextResponseMock(),
    "drizzle-orm": dbOpsMock(),
    "@/db": { getSchoolDB: async () => schoolDb },
    "@/db/schema": { staffProfiles: {} },
    "@/auth/session": { requirePermission: async () => ({ user: { id: "principal-1", schoolId: 1, schoolRole: "principal" } }) },
    "@/db/central": { centralDb: { select: () => ({ from: () => ({ where: () => ({ limit: async () => {
      centralSelectCount += 1
      return centralSelectCount === 1
        ? [{ schoolId: 1, schoolRole: "principal" }]
        : [{ id: created.id, schoolId: 1, schoolRole: "teacher", provisioningStatus: "provisioning" }]
    } }) }) }) } },
    "@/db/centeral-schema": { user: { id: {}, schoolId: {}, schoolRole: {} } },
    "@/auth/account-provisioning": {
      createProvisionedAccount: async (input) => { createdForSchoolId = input.schoolId; return created },
      advanceProvisioningStage: async () => {},
      auditAccountAction: async () => {},
      markProvisioningActive: async () => { activated = true },
      markProvisioningFailed: async () => {},
      requestAccountEmailVerification: async () => { verificationRequested = true; return "not_configured" },
      ProvisioningError: class ProvisioningError extends Error {},
    },
    "@/auth/role-assignment": { canAssignStaffRole: (actor, target) => actor === "principal" && ["teacher", "head_of_class", "head_of_department", "deputy"].includes(target) },
  }
  const route = loadRoute("src/app/api/staff/route.ts", mocks)
  const result = await route.POST(requestWith({ name: created.name, email: created.email, schoolRole: "teacher", schoolId: 2 }))
  assert.equal(result.status, 201)
  assert.equal(profileLinked, true)
  assert.equal(activated, true)
  assert.equal(verificationRequested, true)
  assert.equal(createdForSchoolId, 1, "the server must ignore a client-supplied schoolId")
  assert.equal(result.body.initialPassword, "one-time-secret")
  assert.equal(result.body.staff.role, "teacher")
})

test("portal-users API reuses an existing parent account to link another child", async () => {
  let insertedLink = false
  let audited = false
  const parentProfile = { id: "parent-profile-1", userId: "parent-user-1", name: "Parent Example", phone: "555" }
  const parentAccount = { id: "parent-user-1", name: "Parent Example", email: "parent@example.test", schoolId: 1, schoolRole: "parent", banned: false, provisioningStatus: "active" }
  let transactionReadCount = 0
  const schoolDb = {
    query: {
      parents: { findFirst: async () => parentProfile },
      students: { findFirst: async () => ({ id: "student-2", firstName: "Child", lastName: "Two" }) },
      parentStudents: { findFirst: () => null },
    },
    transaction: (callback) => callback({
      select: () => ({ from: () => ({ where: () => ({ get: () => {
        transactionReadCount += 1
        return transactionReadCount === 1 ? null : { parentId: parentProfile.id, studentId: "student-2" }
      } }) }) }),
      insert: () => ({ values: () => ({ run: () => { insertedLink = true } }) }),
    }),
  }
  let selectCount = 0
  const mocks = {
    "next/server": nextResponseMock(),
    "drizzle-orm": dbOpsMock(),
    "@/db": { getSchoolDB: async () => schoolDb },
    "@/db/schema": { parentStudents: {}, parents: {}, students: {}, studentUsers: {} },
    "@/auth/session": { requirePermission: async () => ({ user: { id: "principal-1", schoolId: 1, schoolRole: "principal" } }) },
    "@/db/central": { centralDb: { select: () => ({ from: () => ({ where: () => ({ limit: async () => { selectCount += 1; return selectCount === 1 ? [{ schoolId: 1 }] : [parentAccount] } }) }) }) } },
    "@/db/centeral-schema": { user: { id: {}, schoolId: {}, schoolRole: {} } },
    "@/lib/student-name": { getStudentFullName: () => "Child Two" },
    "@/auth/account-provisioning": {
      createProvisionedAccount: async () => { throw new Error("must reuse existing account") },
      auditAccountAction: async () => { audited = true },
      markProvisioningActive: async () => {},
      markProvisioningFailed: async () => {},
      requestAccountEmailVerification: async () => "not_configured",
      ProvisioningError: class ProvisioningError extends Error {},
    },
  }
  const route = loadRoute("src/app/api/portal-users/route.ts", mocks)
  const result = await route.POST(requestWith({ role: "parent", email: parentAccount.email, parentId: parentProfile.id, studentIds: ["student-2"] }))
  assert.equal(result.status, 200)
  assert.equal(result.body.linkedExisting, true)
  assert.equal(result.body.user.id, parentAccount.id)
  assert.equal(insertedLink, true)
  assert.equal(audited, true)
  assert.equal("initialPassword" in result.body, false)
})


test("request-session guard blocks initial-password, disabled, failed-provisioning and expired-session access", async () => {
  let account = { schoolId: 1, schoolRole: "teacher", banned: false, banExpires: null, mustChangePassword: false, provisioningStatus: "active" }
  let activeSession = { user: { id: "user-1", schoolId: 1, schoolRole: "teacher" }, session: { id: "session-1" } }
  const mocks = {
    "next/headers": { headers: async () => new Headers() },
    "next/navigation": { redirect: (path) => { throw new Error(`REDIRECT:${path}`) } },
    "drizzle-orm": dbOpsMock(),
    "@/auth/auth": { auth: { api: { getSession: async () => activeSession } } },
    "./auth": { auth: { api: { getSession: async () => activeSession } } },
    "@/db/central": { centralDb: { select: () => ({ from: () => ({ where: () => ({ limit: async () => account ? [account] : [] }) }) }) } },
    "@/db/centeral-schema": { user: { id: {}, schoolId: {}, schoolRole: {}, banned: {}, banExpires: {}, mustChangePassword: {}, provisioningStatus: {} } },
    "@/auth/permissions": { hasPermission: () => false },
    "./permissions": { hasPermission: () => false },
  }
  const sessionModule = loadRoute("src/auth/session.ts", mocks)
  assert.equal(await sessionModule.getRequestSession(new Headers()), activeSession)
  account = { ...account, mustChangePassword: true }
  assert.equal(await sessionModule.getRequestSession(new Headers()), null)
  account = { ...account, mustChangePassword: false, banned: true }
  assert.equal(await sessionModule.getRequestSession(new Headers()), null)
  account = { ...account, banned: false, provisioningStatus: "failed" }
  assert.equal(await sessionModule.getRequestSession(new Headers()), null)
  account = { ...account, provisioningStatus: "active" }
  activeSession = null
  assert.equal(await sessionModule.getRequestSession(new Headers()), null)

  activeSession = { user: { id: "user-1", schoolId: 1, schoolRole: "teacher" }, session: { id: "session-1" } }
  account = { ...account, mustChangePassword: true }
  await assert.rejects(sessionModule.requireSession(), /REDIRECT:\/change-password/)
})


test("initial-password change route clears the gate only after Better Auth accepts the password change", async () => {
  let mustChangePassword = true
  let changeCalls = 0
  const mocks = {
    "next/server": nextResponseMock(),
    "drizzle-orm": dbOpsMock(),
    "@/auth/auth": { auth: { api: {
      getSession: async () => ({ user: { id: "new-user", schoolId: 1 } }),
      changePassword: async ({ body }) => { changeCalls += 1; assert.equal(body.newPassword, "a-new-secure-password"); return { success: true } },
    } } },
    "@/db/central": {
      centralDb: {
        select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ schoolId: 1, mustChangePassword, banned: false, provisioningStatus: "active" }] }) }) }),
        update: () => ({ set: (values) => ({ where: () => ({ returning: async () => { if ("mustChangePassword" in values) mustChangePassword = values.mustChangePassword; return [{ id: "new-user" }] } }) }) }),
      },
    },
    "@/db/centeral-schema": { user: { id: {}, schoolId: {}, mustChangePassword: {}, banned: {}, provisioningStatus: {} } },
    "@/auth/account-provisioning": { auditAccountAction: async () => {} },
  }
  const route = loadRoute("src/app/api/account/change-initial-password/route.ts", mocks)
  const result = await route.POST({ headers: new Headers(), json: async () => ({ currentPassword: "temporary-password", newPassword: "a-new-secure-password" }) })
  assert.equal(result.status, 200)
  assert.equal(mustChangePassword, false)
  assert.equal(changeCalls, 1)
})

test("head-of-class attendance reads are scoped to the assigned academic year", async () => {
  const joins = new Map()
  const classHeads = { userId: "classHeads.userId", classId: "classHeads.classId", academicYearId: "classHeads.academicYearId" }
  const studentEnrollments = { classId: "studentEnrollments.classId", academicYearId: "studentEnrollments.academicYearId" }
  const query = {
    from: () => query,
    innerJoin: (table, condition) => {
      joins.set(table, condition)
      return query
    },
    where: async () => [],
  }
  const eq = (left, right) => ({ operator: "eq", left, right })
  const and = (...conditions) => ({ operator: "and", conditions })
  const mocks = {
    "next/server": nextResponseMock(),
    "drizzle-orm": { eq, and },
    "@/db": { getSchoolDB: async () => ({ select: () => query }) },
    "@/db/schema": {
      attendance: { id: {}, studentEnrollmentId: {}, date: {}, status: {}, note: {}, subjectId: {} },
      teacherAssignments: {},
      studentEnrollments,
      students: {},
      schoolClases: {},
      classHeads,
    },
    "@/auth/permissions": { hasPermission: () => true },
    "@/auth/authorization": { canManageAttendance: async () => true },
    "@/lib/student-name": { getStudentFullName: () => "Student Example" },
    "@/auth/session": {
      getRequestSession: async () => ({
        user: { id: "head-1", schoolRole: "head_of_class" },
      }),
    },
  }
  const route = loadRoute("src/app/api/attendance/route.ts", mocks)
  const result = await route.GET(new Request("http://localhost/api/attendance?date=2026-11-09"))

  assert.equal(result.status, 200)
  assert.deepEqual(joins.get(classHeads), and(
    eq(studentEnrollments.classId, classHeads.classId),
    eq(studentEnrollments.academicYearId, classHeads.academicYearId),
  ))
})

test("school registration recovers a principal after an unrecorded failure", async () => {
  const operationTable = {}
  const userTable = {}
  const schoolsTable = {}
  const principal = {
    id: "principal-1",
    name: "Principal Example",
    email: "principal@example.test",
    schoolId: 42,
    schoolRole: "principal",
    provisioningStatus: "provisioning",
    provisioningOperationId: null,
    banned: false,
    createdAt: new Date("2026-11-08T10:00:01.000Z"),
  }
  const operation = {
    id: "operation-1",
    schoolSlug: "recovery-school",
    adminEmail: principal.email,
    status: "failed",
    stage: "principal_account_creation",
    attempts: 1,
    schoolId: principal.schoolId,
    adminUserId: null,
    createdAt: new Date("2026-11-08T10:00:00.000Z"),
    metadata: null,
  }
  const school = {
    id: principal.schoolId,
    name: "Recovery School",
    slug: operation.schoolSlug,
  }
  let operationReads = 0
  let userReads = 0
  let schoolReads = 0
  let recoveryLinked = false
  let signUpCalled = false

  const centralDb = {
    insert: () => ({
      values: () => ({ onConflictDoNothing: async () => {} }),
    }),
    select: () => ({
      from: (table) => ({
        where: () => ({
          limit: async () => {
            if (table === operationTable) {
              operationReads += 1
              return operationReads === 1 ? [{ id: operation.id }] : [operation]
            }
            if (table === userTable) {
              userReads += 1
              return userReads === 1 ? [] : [principal]
            }
            if (table === schoolsTable) {
              schoolReads += 1
              return [school]
            }
            throw new Error("Unexpected central database table")
          },
        }),
      }),
    }),
    update: (table) => ({
      set: (values) => ({
        where: () => ({
          returning: async () => {
            if (table === userTable && values.provisioningOperationId) {
              recoveryLinked = true
              principal.provisioningOperationId = values.provisioningOperationId
            }
            if (table === userTable && values.provisioningStatus) {
              principal.provisioningStatus = values.provisioningStatus
            }
            Object.assign(table === operationTable ? operation : {}, values)
            return [{ id: table === userTable ? principal.id : operation.id }]
          },
        }),
      }),
    }),
  }
  const schoolDb = {
    insert: () => ({
      values: () => ({ onConflictDoNothing: async () => {} }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [{ id: "profile-1" }] }),
      }),
    }),
  }
  class MockDatabase {
    close() {}
  }
  const sql = (strings, ...values) => ({ strings, values })
  const mocks = {
    "next/server": nextResponseMock(),
    "node:fs": { mkdirSync: () => {} },
    "better-sqlite3": MockDatabase,
    "drizzle-orm": {
      and: (...conditions) => ({ conditions }),
      eq: (left, right) => ({ left, right }),
      gte: (left, right) => ({ left, right }),
      isNull: (value) => ({ value }),
      lt: (left, right) => ({ left, right }),
      or: (...conditions) => ({ conditions }),
      sql,
    },
    "drizzle-orm/better-sqlite3": { drizzle: () => schoolDb },
    "@/auth/auth": {
      auth: {
        api: {
          signUpEmail: async () => {
            signUpCalled = true
            throw new Error("Registration must recover the existing principal")
          },
        },
      },
    },
    "@/auth/account-provisioning": {
      requestAccountEmailVerification: async () => "not_configured",
    },
    "@/db/central": { centralDb },
    "@/db/centeral-schema": {
      schools: schoolsTable,
      user: userTable,
      schoolRegistrationOperations: operationTable,
    },
    "@/db/schema": { staffProfiles: {} },
    "@/db/seed": {
      seedDepartments: async () => {},
      seedActiveAcademicYear: async () => {},
    },
    "@/db/runtime-migrations": { runSchoolMigrations: () => {} },
    "@/db/database-path": { getSchoolDatabasePath: () => "C:\\test\\school_42.db" },
  }
  const route = loadRoute("src/app/api/register-school/route.ts", mocks)
  const result = await route.POST(requestWith({
    name: school.name,
    slug: operation.schoolSlug,
    principalName: principal.name,
    principalEmail: principal.email,
    password: "example-password",
  }))

  assert.equal(result.status, 201)
  assert.equal(result.body.success, true)
  assert.equal(recoveryLinked, true)
  assert.equal(signUpCalled, false)
  assert.equal(principal.provisioningOperationId, operation.id)
  assert.equal(principal.provisioningStatus, "active")
})
