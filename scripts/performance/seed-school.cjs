#!/usr/bin/env node

/**
 * Resumable Performance School Seeder
 *
 * Safety:
 * - Dedicated Performance school only.
 * - Never deletes records.
 * - Reconciles existing records before creating new ones.
 * - DRY_RUN performs GET-only inspection and does not write local files.
 * - Never retries POST requests automatically.
 * - Saves initial teacher passwords immediately after account creation.
 * - Resumes safely after interrupted operations.
 * - Core-subject sync is performed only for classes that are empty.
 * - Existing correct core-subject selections are never replaced.
 */

const fs = require("node:fs")
const path = require("node:path")

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const BASE_URL = (
    process.env.PERF_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "")

const ADMIN_EMAIL = process.env.PERF_EMAIL
const ADMIN_PASSWORD = process.env.PERF_PASSWORD

const CONFIRM = process.env.PERF_TEST_CONFIRM

const EXPECTED_SCHOOL = (
    process.env.PERF_SCHOOL_NAME || "Performance"
).toLowerCase()

const CREATE_PORTAL_ACCOUNTS =
    process.env.PERF_CREATE_PORTAL_ACCOUNTS === "1"

const DRY_RUN = process.env.PERF_DRY_RUN === "1"

const ROOT = process.cwd()

const LOCAL_DIR = path.join(
    ROOT,
    "tests",
    "performance",
)

const CREDENTIALS_FILE = path.join(
    LOCAL_DIR,
    ".credentials.local.json",
)

const MANIFEST_FILE = path.join(
    LOCAL_DIR,
    ".seed-manifest.local.json",
)

const TEACHER_COUNT = 40
const STUDENT_COUNT = 1000

const sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms))

// --------------------------------------------------
// Safety checks
// --------------------------------------------------

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
        "Set PERF_EMAIL and PERF_PASSWORD before running.",
    )
}

if (CONFIRM !== "YES") {
    throw new Error(
        "Safety stop: PERF_TEST_CONFIRM must equal YES.",
    )
}

if (CREATE_PORTAL_ACCOUNTS) {
    throw new Error(
        "Portal account creation is disabled in this version.",
    )
}

// --------------------------------------------------
// Local state
// --------------------------------------------------

function readJson(file, fallback) {
    try {
        return JSON.parse(
            fs.readFileSync(file, "utf8"),
        )
    } catch {
        return fallback
    }
}

function saveJson(file, value) {
    fs.mkdirSync(
        path.dirname(file),
        { recursive: true },
    )

    const temporaryFile = `${file}.tmp`

    fs.writeFileSync(
        temporaryFile,
        JSON.stringify(value, null, 2) + "\n",
        "utf8",
    )

    fs.renameSync(
        temporaryFile,
        file,
    )
}

const credentials = readJson(
    CREDENTIALS_FILE,
    [],
)

const previousManifest = readJson(
    MANIFEST_FILE,
    null,
)

const manifest = previousManifest || {
    generatedAt: new Date().toISOString(),
    school: null,
    academicYear: null,
    counts: {},
    classIds: [],
    subjectIds: [],
    teacherIds: [],
    studentIds: [],
    completed: {},
    pendingAccounts: [],
}

function checkpoint() {
    if (DRY_RUN) {
        return
    }

    manifest.updatedAt = new Date().toISOString()

    saveJson(
        CREDENTIALS_FILE,
        credentials,
    )

    saveJson(
        MANIFEST_FILE,
        manifest,
    )
}

// --------------------------------------------------
// General helpers
// --------------------------------------------------

function normalized(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
}

function progress(label, current, total) {
    const percentage = Math.round(
        (current / total) * 100,
    )

    console.log(
        `${label}: ${current}/${total} (${percentage}%)`,
    )
}

function unique(values) {
    return [...new Set(values)]
}

function sameIds(first, second) {
    const a = [...first].map(String).sort()
    const b = [...second].map(String).sort()

    return (
        a.length === b.length &&
        a.every((id, index) => id === b[index])
    )
}

function findByName(rows, name) {
    return rows.find(
        (row) =>
            normalized(row.name) === normalized(name),
    )
}

function findCredential(email) {
    return credentials.find(
        (item) =>
            normalized(item.email) === normalized(email),
    )
}

function saveCredential(entry) {
    const index = credentials.findIndex(
        (item) =>
            normalized(item.email) === normalized(entry.email),
    )

    if (index >= 0) {
        credentials[index] = {
            ...credentials[index],
            ...entry,
        }
    } else {
        credentials.push(entry)
    }

    checkpoint()
}

function markPendingAccount(email, userId, reason) {
    manifest.pendingAccounts = [
        ...manifest.pendingAccounts.filter(
            (item) =>
                normalized(item.email) !== normalized(email),
        ),
        {
            email,
            userId,
            reason,
        },
    ]

    checkpoint()
}

function clearPendingAccount(email) {
    manifest.pendingAccounts =
        manifest.pendingAccounts.filter(
            (item) =>
                normalized(item.email) !== normalized(email),
        )

    checkpoint()
}

// --------------------------------------------------
// Naming helpers
// --------------------------------------------------

function teacherEmail(index) {
    return `teacher${String(index).padStart(3, "0")}@performance.test`
}

function teacherPassword(index) {
    return `PerfTeacher-${String(index).padStart(3, "0")}-Safe!2026`
}

function studentAdmission(index) {
    return `PERF-${String(index).padStart(4, "0")}`
}

function expectedClassIndex(studentIndex) {
    return Math.min(
        Math.floor(
            (studentIndex - 1) /
            Math.ceil(STUDENT_COUNT / 6),
        ),
        5,
    )
}

// --------------------------------------------------
// HTTP and cookies
// --------------------------------------------------

function cookieHeader(jar) {
    return [...jar.entries()]
        .map(([key, value]) => `${key}=${value}`)
        .join("; ")
}

async function request(
    pathname,
    {
        method = "GET",
        body,
        jar = new Map(),
    } = {},
) {
    const headers = {
        accept: "application/json",
        origin: BASE_URL,
    }

    if (body !== undefined) {
        headers["content-type"] = "application/json"
    }

    const cookie = cookieHeader(jar)

    if (cookie) {
        headers.cookie = cookie
    }

    const response = await fetch(
        `${BASE_URL}${pathname}`,
        {
            method,
            headers,
            body:
                body === undefined
                    ? undefined
                    : JSON.stringify(body),
            redirect: "manual",
        },
    )

    const setCookies =
        typeof response.headers.getSetCookie === "function"
            ? response.headers.getSetCookie()
            : [response.headers.get("set-cookie")].filter(Boolean)

    for (const raw of setCookies) {
        const pair = raw.split(";", 1)[0]
        const index = pair.indexOf("=")

        if (index <= 0) continue

        const name = pair.slice(0, index).trim()
        const value = pair.slice(index + 1).trim()

        if (!value) {
            jar.delete(name)
        } else {
            jar.set(name, value)
        }
    }

    const responseText = await response.text()

    let data = null

    try {
        data = responseText
            ? JSON.parse(responseText)
            : null
    } catch {
        data = {
            raw: responseText.slice(0, 500),
        }
    }

    return {
        response,
        data,
        jar,
    }
}

function retryDelay(response, attempt) {
    const retryAfter =
        response?.headers?.get("retry-after")

    if (retryAfter) {
        const seconds = Number(retryAfter)

        if (Number.isFinite(seconds)) {
            return Math.min(
                seconds * 1000,
                120000,
            )
        }

        const date = Date.parse(retryAfter)

        if (Number.isFinite(date)) {
            return Math.min(
                Math.max(date - Date.now(), 1000),
                120000,
            )
        }
    }

    return Math.min(
        3000 * (2 ** attempt),
        120000,
    )
}

async function api(pathname, options = {}) {
    const method = options.method || "GET"

    // Only GET and sign-in requests are retried.
    // POST requests must never be replayed automatically.
    const safeToRetry =
        method === "GET" ||
        pathname === "/api/auth/sign-in/email"

    const maxRetries = safeToRetry
        ? (options.maxRetries ?? 5)
        : 0

    for (
        let attempt = 0;
        attempt <= maxRetries;
        attempt++
    ) {
        const result = await request(
            pathname,
            options,
        )

        if (
            result.response.status === 429 &&
            attempt < maxRetries
        ) {
            const delay = retryDelay(
                result.response,
                attempt,
            )

            console.log(
                `429 on ${pathname}. Waiting ${Math.ceil(delay / 1000)} seconds (${attempt + 1}/${maxRetries}).`,
            )

            await sleep(delay)
            continue
        }

        if (!result.response.ok) {
            const detail =
                result.data?.error ||
                result.data?.message ||
                result.data?.raw ||
                result.response.statusText

            throw new Error(
                `${method} ${pathname} failed (${result.response.status}): ${detail}`,
            )
        }

        return result.data
    }

    throw new Error(
        `Retry limit reached for ${pathname}.`,
    )
}

// --------------------------------------------------
// Authentication
// --------------------------------------------------

async function login(email, password) {
    const jar = new Map()

    await api(
        "/api/auth/sign-in/email",
        {
            method: "POST",
            body: {
                email,
                password,
            },
            jar,
        },
    )

    if (jar.size === 0) {
        throw new Error(
            `No session cookie returned for ${email}.`,
        )
    }

    return jar
}

async function changeInitialPassword(
    email,
    initialPassword,
    newPassword,
) {
    const jar = await login(
        email,
        initialPassword,
    )

    // Never automatically retry this POST.
    await api(
        "/api/account/change-initial-password",
        {
            method: "POST",
            jar,
            body: {
                currentPassword: initialPassword,
                newPassword,
            },
        },
    )

    // Verify the new password.
    await login(
        email,
        newPassword,
    )

    return {
        email,
        password: newPassword,
    }
}

async function activateTeacher(
    email,
    saved,
    index,
) {
    const finalPassword = teacherPassword(index)

    // First, check whether the password change
    // already succeeded in a previous interrupted run.
    try {
        await login(
            email,
            finalPassword,
        )

        saveCredential({
            email,
            password: finalPassword,
            initialPassword: undefined,
            status: "active",
            role: "teacher",
            userId: saved.userId,
        })

        clearPendingAccount(email)

        return true
    } catch {
        // Continue to initial password if available.
    }

    if (!saved?.initialPassword) {
        return false
    }

    await changeInitialPassword(
        email,
        saved.initialPassword,
        finalPassword,
    )

    saveCredential({
        email,
        password: finalPassword,
        initialPassword: undefined,
        status: "active",
        role: "teacher",
        userId: saved.userId,
    })

    clearPendingAccount(email)

    return true
}

// --------------------------------------------------
// API response validation
// --------------------------------------------------

function extractRows(payload, keys) {
    if (Array.isArray(payload)) {
        return payload
    }

    if (!payload || typeof payload !== "object") {
        return null
    }

    for (const key of keys) {
        if (Array.isArray(payload[key])) {
            return payload[key]
        }
    }

    if (
        payload.data &&
        typeof payload.data === "object"
    ) {
        for (const key of keys) {
            if (Array.isArray(payload.data[key])) {
                return payload.data[key]
            }
        }

        if (Array.isArray(payload.data)) {
            return payload.data
        }
    }

    return null
}

function requiredRows(
    payload,
    keys,
    endpoint,
) {
    const rows = extractRows(
        payload,
        keys,
    )

    if (!rows) {
        throw new Error(
            `Cannot safely read ${endpoint}. Unexpected API response.`,
        )
    }

    return rows
}

// --------------------------------------------------
// Definitions
// --------------------------------------------------

const DEPARTMENT_NAMES = [
    "Languages",
    "Mathematics",
    "Science",
    "Computer Science",
    "History & Geography",
    "Social Studies",
    "Religious Studies",
    "Arts",
    "Other",
]

const SUBJECT_DEFINITIONS = [
    ["English", "Languages"],
    ["Arabic", "Languages"],
    ["French", "Languages"],
    ["Mathematics", "Mathematics"],
    ["General Science", "Science"],
    ["Physics", "Science"],
    ["Chemistry", "Science"],
    ["Biology", "Science"],
    ["Computer Studies", "Computer Science"],
    ["ICT", "Computer Science"],
    ["History", "History & Geography"],
    ["Geography", "History & Geography"],
    ["Civics", "Social Studies"],
    ["Social Studies", "Social Studies"],
    ["Islamic Studies", "Religious Studies"],
    ["Christian Studies", "Religious Studies"],
    ["Art", "Arts"],
    ["Music", "Arts"],
    ["Physical Education", "Other"],
    ["Business Studies", "Other"],
    ["Agriculture", "Science"],
]

const CORE_SUBJECT_NAMES = new Set([
    "English",
    "Arabic",
    "Mathematics",
    "General Science",
    "History",
    "Computer Studies",
])

// --------------------------------------------------
// Initial inspection
// --------------------------------------------------

async function inspectInitialState(adminJar) {
    const [
        classesPayload,
        subjectsPayload,
        enrollmentsPayload,
        staffPayload,
        yearsPayload,
        departmentsPayload,
    ] = await Promise.all([
        api("/api/classes", { jar: adminJar }),
        api("/api/subjects", { jar: adminJar }),
        api("/api/enrollments", { jar: adminJar }),
        api("/api/staff", { jar: adminJar }),
        api("/api/academic-years", { jar: adminJar }),
        api("/api/departments", { jar: adminJar }),
    ])

    const classes = requiredRows(
        classesPayload,
        ["classes"],
        "/api/classes",
    )

    const subjects = requiredRows(
        subjectsPayload,
        ["subjects"],
        "/api/subjects",
    )

    const enrollments = requiredRows(
        enrollmentsPayload,
        ["enrollments"],
        "/api/enrollments",
    )

    const staff = requiredRows(
        staffPayload,
        ["staff"],
        "/api/staff",
    )

    const departments = requiredRows(
        departmentsPayload,
        ["departments"],
        "/api/departments",
    )

    const academicYears = requiredRows(
        yearsPayload,
        ["academicYears"],
        "/api/academic-years",
    )

    const matchingPrincipals = staff.filter(
        (item) =>
            item.role === "principal" &&
            normalized(item.email) === normalized(ADMIN_EMAIL) &&
            item.provisioningStatus === "active",
    )

    if (matchingPrincipals.length !== 1) {
        throw new Error(
            `Principal verification failed: ${matchingPrincipals.length} matching active principals.`,
        )
    }

    const unexpectedStaff = staff.filter(
        (item) =>
            item.id !== matchingPrincipals[0].id,
    )

    if (
        classes.length > 6 ||
        subjects.length > 21 ||
        unexpectedStaff.length > TEACHER_COUNT
    ) {
        throw new Error(
            "Unexpected existing data count. Manual inspection required.",
        )
    }

    const activeYear = academicYears.find(
        (year) => year.isActive,
    )

    if (!activeYear) {
        throw new Error(
            "No active academic year found.",
        )
    }

    return {
        classes,
        subjects,
        enrollments,
        staff,
        departments,
        activeYear,
    }
}

// --------------------------------------------------
// Core-subject inspection
// --------------------------------------------------

async function inspectCoreSubjects(
    adminJar,
    activeYear,
    classRows,
    subjectRows,
) {
    const coreSubjectIds = subjectRows
        .filter((subject) =>
            CORE_SUBJECT_NAMES.has(subject.name),
        )
        .map((subject) => subject.id)

    if (coreSubjectIds.length !== 6) {
        throw new Error(
            `Expected 6 core subjects, found ${coreSubjectIds.length}.`,
        )
    }

    const states = []

    for (const schoolClass of classRows) {
        const result = await api(
            `/api/core-subjects?academicYearId=${encodeURIComponent(activeYear.id)}&classId=${encodeURIComponent(schoolClass.id)}`,
            { jar: adminJar },
        )

        if (!Array.isArray(result.subjectIds)) {
            throw new Error(
                `Unexpected core-subject response for ${schoolClass.name}.`,
            )
        }

        states.push({
            classId: schoolClass.id,
            className: schoolClass.name,
            subjectIds: result.subjectIds,
        })
    }

    const correct = states.filter(
        (state) =>
            sameIds(
                state.subjectIds,
                coreSubjectIds,
            ),
    )

    const empty = states.filter(
        (state) =>
            state.subjectIds.length === 0,
    )

    const invalid = states.filter(
        (state) =>
            !sameIds(
                state.subjectIds,
                coreSubjectIds,
            ) &&
            state.subjectIds.length !== 0,
    )

    return {
        coreSubjectIds,
        states,
        correct,
        empty,
        invalid,
    }
}

// --------------------------------------------------
// Assignment inspection
// --------------------------------------------------

async function inspectAssignments(adminJar) {
    const payload = await api(
        "/api/teacher-assignments",
        { jar: adminJar },
    )

    const assignments = requiredRows(
        payload,
        ["assignments", "teacherAssignments"],
        "/api/teacher-assignments",
    )

    const keys = new Set()

    for (const item of assignments) {
        const key = `${item.classId}:${item.subjectId}`

        if (keys.has(key)) {
            throw new Error(
                `Duplicate existing assignment detected: ${key}.`,
            )
        }

        keys.add(key)
    }

    return {
        assignments,
        keys,
    }
}

// --------------------------------------------------
// Student inspection
// --------------------------------------------------

function inspectStudents(
    enrollments,
    activeYear,
    classRows,
) {
    const currentYearEnrollments = enrollments.filter(
        (item) =>
            String(item.academicYearId) === String(activeYear.id),
    )

    const studentsByAdmission = new Map()

    for (const enrollment of currentYearEnrollments) {
        const student = enrollment.student

        if (
            !student?.admissionNumber ||
            !student?.id
        ) {
            throw new Error(
                "An enrollment has incomplete student information. Cannot safely reconcile students.",
            )
        }

        const admission = normalized(
            student.admissionNumber,
        )

        if (studentsByAdmission.has(admission)) {
            throw new Error(
                `Multiple active-year enrollments found for ${student.admissionNumber}.`,
            )
        }

        studentsByAdmission.set(
            admission,
            {
                student,
                enrollment,
            },
        )
    }

    const existing = []
    const missing = []
    const misplaced = []

    for (
        let index = 1;
        index <= STUDENT_COUNT;
        index++
    ) {
        const admissionNumber = studentAdmission(index)

        const expectedClass =
            classRows[expectedClassIndex(index)]

        const row = studentsByAdmission.get(
            normalized(admissionNumber),
        )

        if (!row) {
            missing.push(admissionNumber)
            continue
        }

        if (
            String(row.enrollment.classId) !==
            String(expectedClass.id)
        ) {
            misplaced.push({
                admissionNumber,
                actualClassId: row.enrollment.classId,
                expectedClassId: expectedClass.id,
            })

            continue
        }

        existing.push({
            admissionNumber,
            studentId: row.student.id,
            classId: expectedClass.id,
        })
    }

    return {
        studentsByAdmission,
        existing,
        missing,
        misplaced,
        currentYearEnrollments,
    }
}

// --------------------------------------------------
// Dry run
// --------------------------------------------------

async function runDryRun({
    adminJar,
    school,
    activeYear,
    classes,
    subjects,
    departments,
    staff,
    enrollments,
}) {
    console.log("\n========================================")
    console.log("PERFORMANCE SEED - DRY RUN")
    console.log("========================================")

    console.log(`School: ${school.name}`)
    console.log(`School ID: ${school.id}`)
    console.log(`Academic year: ${activeYear.name}`)
    console.log(`Academic year ID: ${activeYear.id}`)

    // Departments
    const departmentMap = new Map(
        departments.map(
            (item) => [
                normalized(item.name),
                item,
            ],
        ),
    )

    const missingDepartments = DEPARTMENT_NAMES.filter(
        (name) =>
            !departmentMap.has(normalized(name)),
    )

    // Classes
    const expectedClasses = Array.from(
        { length: 6 },
        (_, index) => ({
            name: `Performance Grade ${index + 1}`,
            grade: index + 1,
        }),
    )

    const missingClasses = []

    for (const expected of expectedClasses) {
        const existing = findByName(
            classes,
            expected.name,
        )

        if (!existing) {
            missingClasses.push(expected.name)
            continue
        }

        if (
            Number(existing.gradeLevel) !== expected.grade
        ) {
            throw new Error(
                `Class ${expected.name} has an unexpected grade level.`,
            )
        }
    }

    // Subjects
    const missingSubjects = SUBJECT_DEFINITIONS
        .filter(
            ([name]) =>
                !findByName(subjects, name),
        )
        .map(([name]) => name)

    // Existing teachers
    const teacherStates = []

    for (
        let index = 1;
        index <= TEACHER_COUNT;
        index++
    ) {
        const email = teacherEmail(index)

        const existing = staff.find(
            (item) =>
                normalized(item.email) === normalized(email),
        )

        const saved = findCredential(email)

        if (!existing) {
            teacherStates.push({
                email,
                status: "missing",
            })

            continue
        }

        if (existing.role !== "teacher") {
            throw new Error(
                `${email} exists with unexpected role ${existing.role}.`,
            )
        }

        if (saved?.password) {
            teacherStates.push({
                email,
                status: "credential-saved",
            })
        } else if (index === 2) {
            teacherStates.push({
                email,
                status: "pending-password-recovery",
            })
        } else if (index === 1) {
            teacherStates.push({
                email,
                status: "known-password-needs-verification",
            })
        } else {
            teacherStates.push({
                email,
                status: "existing-without-credential",
            })
        }
    }

    const existingTeachers = teacherStates.filter(
        (item) => item.status !== "missing",
    ).length

    const missingTeachers = teacherStates.filter(
        (item) => item.status === "missing",
    ).length

    // Core subjects
    const classRows = expectedClasses.map(
        (expected) =>
            findByName(classes, expected.name),
    ).filter(Boolean)

    const subjectRows = SUBJECT_DEFINITIONS.map(
        ([name]) =>
            findByName(subjects, name),
    ).filter(Boolean)

    let coreInspection = null

    if (
        classRows.length === 6 &&
        subjectRows.length === 21
    ) {
        coreInspection = await inspectCoreSubjects(
            adminJar,
            activeYear,
            classRows,
            subjectRows,
        )
    }

    // Assignments
    const assignmentInspection = await inspectAssignments(
        adminJar,
    )

    const expectedAssignmentCount =
        classRows.length * subjectRows.length

    const existingExpectedAssignments =
        assignmentInspection.assignments.filter(
            (item) =>
                classRows.some(
                    (row) => String(row.id) === String(item.classId),
                ) &&
                subjectRows.some(
                    (row) => String(row.id) === String(item.subjectId),
                ),
        ).length

    const missingAssignments =
        Math.max(
            expectedAssignmentCount -
            existingExpectedAssignments,
            0,
        )

    // Students
    let studentInspection = null

    if (classRows.length === 6) {
        studentInspection = inspectStudents(
            enrollments,
            activeYear,
            classRows,
        )
    }

    // Report
    console.log("\n--- Departments ---")
    console.log(`Existing: ${departments.length}`)
    console.log(`Required: ${DEPARTMENT_NAMES.length}`)
    console.log(`Missing: ${missingDepartments.length}`)

    if (missingDepartments.length) {
        console.log(missingDepartments)
    }

    console.log("\n--- Classes ---")
    console.log(`Existing: ${classes.length}`)
    console.log(`Required: 6`)
    console.log(`Missing: ${missingClasses.length}`)

    if (missingClasses.length) {
        console.log(missingClasses)
    }

    console.log("\n--- Subjects ---")
    console.log(`Existing: ${subjects.length}`)
    console.log(`Required: 21`)
    console.log(`Missing: ${missingSubjects.length}`)

    if (missingSubjects.length) {
        console.log(missingSubjects)
    }

    console.log("\n--- Core subjects ---")

    if (coreInspection) {
        console.log(`Correct classes: ${coreInspection.correct.length}`)
        console.log(`Empty classes: ${coreInspection.empty.length}`)
        console.log(`Invalid classes: ${coreInspection.invalid.length}`)

        for (const state of coreInspection.invalid) {
            console.log(
                `Invalid configuration: ${state.className}`,
            )
        }
    } else {
        console.log(
            "Cannot inspect core subjects until all six classes and 21 subjects exist.",
        )
    }

    console.log("\n--- Teachers ---")
    console.log(`Existing: ${existingTeachers}`)
    console.log(`Missing: ${missingTeachers}`)

    for (const state of teacherStates) {
        if (state.status !== "credential-saved") {
            console.log(
                `${state.email}: ${state.status}`,
            )
        }
    }

    console.log("\n--- Teacher assignments ---")
    console.log(`Existing expected assignments: ${existingExpectedAssignments}`)
    console.log(`Expected total: ${expectedAssignmentCount}`)
    console.log(`Missing: ${missingAssignments}`)

    console.log("\n--- Students ---")

    if (studentInspection) {
        console.log(`Existing: ${studentInspection.existing.length}`)
        console.log(`Missing: ${studentInspection.missing.length}`)
        console.log(`Misplaced: ${studentInspection.misplaced.length}`)

        if (studentInspection.misplaced.length) {
            console.log(studentInspection.misplaced)
        }
    } else {
        console.log(
            "Cannot inspect students until all six classes exist.",
        )
    }

    console.log("\n--- Safety checks ---")

    const invalidCore =
        coreInspection?.invalid.length > 0

    const misplacedStudents =
        studentInspection?.misplaced.length > 0

    const unexpectedExistingTeachers =
        teacherStates.some(
            (item) =>
                item.status === "existing-without-credential",
        )

    console.log(
        `Invalid core subjects: ${invalidCore ? "YES" : "NO"}`,
    )

    console.log(
        `Misplaced students: ${misplacedStudents ? "YES" : "NO"}`,
    )

    console.log(
        `Unexpected existing teachers without credentials: ${unexpectedExistingTeachers ? "YES" : "NO"}`,
    )

    console.log("\n========================================")
    console.log("DRY RUN COMPLETE")
    console.log("No database records were created or modified.")
    console.log("No local credentials or manifest files were written.")
    console.log("========================================")

    if (
        invalidCore ||
        misplacedStudents ||
        unexpectedExistingTeachers
    ) {
        console.log(
            "\nWARNING: Resolve the reported inconsistencies before live seeding.",
        )
    }
}

// --------------------------------------------------
// Main
// --------------------------------------------------

async function main() {
    console.log(`Connecting to ${BASE_URL}`)

    const adminJar = await login(
        ADMIN_EMAIL,
        ADMIN_PASSWORD,
    )

    const schoolPayload = await api(
        "/api/school",
        { jar: adminJar },
    )

    const school = schoolPayload.school

    if (
        !school?.name ||
        !school.name.toLowerCase().includes(EXPECTED_SCHOOL)
    ) {
        throw new Error(
            `Refusing to seed school "${school?.name || "unknown"}".`,
        )
    }

    console.log(
        `Confirmed Performance school: ${school.name} (id ${school.id})`,
    )

    if (
        manifest.school?.id &&
        String(manifest.school.id) !== String(school.id)
    ) {
        throw new Error(
            "Manifest belongs to another school.",
        )
    }

    const initial = await inspectInitialState(adminJar)

    const {
        classes,
        subjects,
        enrollments,
        staff,
        departments,
        activeYear,
    } = initial

    console.log(
        `Existing records: ${classes.length} classes, ${subjects.length} subjects, ${enrollments.length} enrollments, ${staff.length} staff, ${departments.length} departments.`,
    )

    if (
        manifest.academicYear?.id &&
        String(manifest.academicYear.id) !== String(activeYear.id)
    ) {
        throw new Error(
            "Active academic year differs from the saved manifest.",
        )
    }

    // DRY RUN exits before any local checkpoint or POST request.
    if (DRY_RUN) {
        await runDryRun({
            adminJar,
            school,
            activeYear,
            classes,
            subjects,
            departments,
            staff,
            enrollments,
        })

        return
    }

    manifest.school = {
        id: school.id,
        name: school.name,
        slug: school.slug,
    }

    manifest.academicYear = {
        id: activeYear.id,
        name: activeYear.name,
    }

    checkpoint()

    // --------------------------------------------------
    // PHASE 1: Departments
    // --------------------------------------------------

    console.log("\nPHASE 1: Departments")

    const departmentMap = new Map(
        departments.map(
            (item) => [
                normalized(item.name),
                item,
            ],
        ),
    )

    for (const name of DEPARTMENT_NAMES) {
        if (departmentMap.has(normalized(name))) {
            continue
        }

        const created = await api(
            "/api/departments",
            {
                method: "POST",
                jar: adminJar,
                body: { name },
            },
        )

        const row =
            created.department ||
            created.data ||
            created

        if (!row?.id) {
            throw new Error(
                `Could not resolve department ${name}.`,
            )
        }

        departmentMap.set(
            normalized(name),
            row,
        )

        checkpoint()

        console.log(`Created department: ${name}`)
    }

    function departmentId(name) {
        const row = departmentMap.get(
            normalized(name),
        )

        if (!row?.id) {
            throw new Error(
                `Department not found: ${name}`,
            )
        }

        return row.id
    }

    // --------------------------------------------------
    // PHASE 2: Classes
    // --------------------------------------------------

    console.log("\nPHASE 2: Classes")

    const classRows = []

    for (let grade = 1; grade <= 6; grade++) {
        const name = `Performance Grade ${grade}`

        let row = findByName(
            classes,
            name,
        )

        if (row) {
            if (Number(row.gradeLevel) !== grade) {
                throw new Error(
                    `Existing class ${name} has unexpected gradeLevel.`,
                )
            }
        } else {
            const created = await api(
                "/api/classes",
                {
                    method: "POST",
                    jar: adminJar,
                    body: {
                        name,
                        gradeLevel: grade,
                    },
                },
            )

            row =
                created.data?.[0] ||
                created.class ||
                created.data

            if (!row?.id) {
                throw new Error(
                    `Could not resolve created class ${name}.`,
                )
            }

            classes.push(row)

            checkpoint()

            console.log(`Created ${name}`)
        }

        classRows.push(row)
    }

    manifest.classIds = classRows.map(
        (row) => row.id,
    )

    manifest.counts.classes = classRows.length
    manifest.completed.classes = true

    checkpoint()

    // --------------------------------------------------
    // PHASE 3: Subjects
    // --------------------------------------------------

    console.log("\nPHASE 3: Subjects")

    const subjectRows = []

    for (const [name, department] of SUBJECT_DEFINITIONS) {
        let row = findByName(
            subjects,
            name,
        )

        if (!row) {
            const created = await api(
                "/api/subjects",
                {
                    method: "POST",
                    jar: adminJar,
                    body: {
                        name,
                        departmentId: departmentId(department),
                    },
                },
            )

            row =
                created.subject ||
                created.data ||
                created

            if (!row?.id) {
                throw new Error(
                    `Could not resolve subject ${name}.`,
                )
            }

            subjects.push(row)

            checkpoint()

            console.log(`Created subject: ${name}`)
        }

        subjectRows.push(row)
    }

    manifest.subjectIds = subjectRows.map(
        (row) => row.id,
    )

    manifest.counts.subjects = subjectRows.length
    manifest.completed.subjects = true

    checkpoint()

    // --------------------------------------------------
    // PHASE 4: Core subjects
    // --------------------------------------------------

    console.log("\nPHASE 4: Core subjects")

    const coreInspection = await inspectCoreSubjects(
        adminJar,
        activeYear,
        classRows,
        subjectRows,
    )

    if (coreInspection.invalid.length > 0) {
        throw new Error(
            "Some classes have partially configured or unexpected core subjects. No core-subject changes were made. Manual inspection required.",
        )
    }

    if (coreInspection.correct.length === 6) {
        console.log(
            "All 36 core-subject selections already exist. Skipping POST.",
        )
    } else {
        for (const state of coreInspection.empty) {
            const schoolClass = classRows.find(
                (row) =>
                    String(row.id) === String(state.classId),
            )

            console.log(
                `Configuring core subjects for ${schoolClass.name}.`,
            )

            await api(
                "/api/core-subjects",
                {
                    method: "POST",
                    jar: adminJar,
                    body: {
                        academicYearId: activeYear.id,
                        classId: schoolClass.id,
                        subjectIds: coreInspection.coreSubjectIds,
                    },
                },
            )

            checkpoint()
        }

        // Verify all classes after writing.
        const verified = await inspectCoreSubjects(
            adminJar,
            activeYear,
            classRows,
            subjectRows,
        )

        if (verified.correct.length !== 6) {
            throw new Error(
                "Core-subject verification failed after configuration.",
            )
        }
    }

    manifest.counts.coreSubjectsPerClass = 6
    manifest.counts.coreSubjectSelections = 36
    manifest.completed.coreSubjects = true

    checkpoint()

    // --------------------------------------------------
    // PHASE 5: Teachers
    // --------------------------------------------------

    console.log("\nPHASE 5: Teachers")

    const teacherRows = []

    for (
        let index = 1;
        index <= TEACHER_COUNT;
        index++
    ) {
        const number = String(index).padStart(3, "0")
        const email = teacherEmail(index)

        let existing = staff.find(
            (item) =>
                normalized(item.email) === normalized(email),
        )

        if (existing && existing.role !== "teacher") {
            throw new Error(
                `${email} exists with unexpected role ${existing.role}.`,
            )
        }

        if (!existing) {
            const created = await api(
                "/api/staff",
                {
                    method: "POST",
                    jar: adminJar,
                    body: {
                        name: `Performance Teacher ${number}`,
                        email,
                        phone: `091000${number}`,
                        role: "teacher",
                    },
                },
            )

            if (
                !created.staff?.id ||
                !created.initialPassword
            ) {
                throw new Error(
                    `Teacher ${number} creation response was incomplete. Inspect the staff record before retrying.`,
                )
            }

            existing = {
                id: created.staff.id,
                email,
                role: "teacher",
                provisioningStatus: "active",
            }

            staff.push(existing)

            // Critical: save the initial password immediately.
            // If authentication or password change fails,
            // the initial password remains available for resuming.
            saveCredential({
                email,
                initialPassword: created.initialPassword,
                status: "initial-password-saved",
                role: "teacher",
                userId: existing.id,
            })

            console.log(
                `Created teacher ${number}. Initial credential saved.`,
            )
        }

        let saved = findCredential(email)

        if (
            !saved &&
            index === 1
        ) {
            // Teacher 001 was activated in the previous run.
            // Verify its deterministic final password.
            saved = {
                email,
                password: teacherPassword(1),
                userId: existing.id,
            }

            try {
                await login(
                    email,
                    saved.password,
                )

                saveCredential({
                    email,
                    password: saved.password,
                    status: "active",
                    role: "teacher",
                    userId: existing.id,
                })

                saved = findCredential(email)
            } catch (error) {
                throw new Error(
                    `Could not verify teacher001 credentials: ${error.message}`,
                )
            }
        }

        if (
            saved?.password ||
            saved?.initialPassword
        ) {
            try {
                const activated = await activateTeacher(
                    email,
                    saved,
                    index,
                )

                if (!activated) {
                    markPendingAccount(
                        email,
                        existing.id,
                        "No usable initial or final password is available.",
                    )

                    console.log(
                        `Teacher ${number} preserved; password recovery is pending.`,
                    )
                } else {
                    console.log(
                        `Teacher ${number} credentials verified.`,
                    )
                }
            } catch (error) {
                markPendingAccount(
                    email,
                    existing.id,
                    error.message,
                )

                throw new Error(
                    `Teacher ${number} exists but activation failed. Its saved credentials and account were preserved. Resume later. ${error.message}`,
                )
            }
        } else if (index === 2) {
            // Known previous issue:
            // teacher002 exists, but its initial password was lost.
            markPendingAccount(
                email,
                existing.id,
                "Initial password unavailable. Password recovery required.",
            )

            console.log(
                "Teacher 002 preserved; password recovery remains pending.",
            )
        } else {
            // Never guess passwords for unexpected existing accounts.
            markPendingAccount(
                email,
                existing.id,
                "Existing teacher has no saved credential. Password recovery required.",
            )

            console.log(
                `Teacher ${number} exists without saved credentials. Account preserved and marked pending.`,
            )
        }

        teacherRows.push({
            id: existing.id,
            email,
        })

        manifest.teacherIds = teacherRows.map(
            (row) => row.id,
        )

        manifest.counts.teachers = teacherRows.length

        checkpoint()

        progress(
            "Teachers reconciled",
            index,
            TEACHER_COUNT,
        )
    }

    manifest.counts.teachers = teacherRows.length
    manifest.completed.teachers = true

    checkpoint()

    // --------------------------------------------------
    // PHASE 6: Teacher assignments
    // --------------------------------------------------

    console.log("\nPHASE 6: Teacher assignments")

    const assignmentInspection = await inspectAssignments(
        adminJar,
    )

    const assignmentKeys = assignmentInspection.keys

    let assignmentCount = 0
    let createdAssignmentCount = 0

    for (
        let classIndex = 0;
        classIndex < classRows.length;
        classIndex++
    ) {
        for (
            let subjectIndex = 0;
            subjectIndex < subjectRows.length;
            subjectIndex++
        ) {
            const schoolClass = classRows[classIndex]
            const subject = subjectRows[subjectIndex]

            const teacher =
                teacherRows[
                    assignmentCount % teacherRows.length
                ]

            const key =
                `${schoolClass.id}:${subject.id}`

            if (!assignmentKeys.has(key)) {
                await api(
                    "/api/teacher-assignments",
                    {
                        method: "POST",
                        jar: adminJar,
                        body: {
                            teacherId: teacher.id,
                            subjectId: subject.id,
                            classId: schoolClass.id,
                        },
                    },
                )

                assignmentKeys.add(key)
                createdAssignmentCount++

                checkpoint()
            }

            assignmentCount++
        }
    }

    // Verify assignments from the API.
    const verifiedAssignments = await inspectAssignments(
        adminJar,
    )

    if (verifiedAssignments.assignments.length < assignmentCount) {
        throw new Error(
            "Teacher assignment verification failed.",
        )
    }

    manifest.counts.teacherAssignments = assignmentCount
    manifest.counts.createdTeacherAssignments = createdAssignmentCount
    manifest.completed.assignments = true

    checkpoint()

    console.log(
        `Assignments reconciled: ${assignmentCount}. Newly created: ${createdAssignmentCount}.`,
    )

    // --------------------------------------------------
    // PHASE 7: Students
    // --------------------------------------------------

    console.log("\nPHASE 7: Students")

    // Refresh enrollments before creating students.
    // This also recovers from an interrupted previous POST.
    const refreshedEnrollmentsPayload = await api(
        "/api/enrollments",
        { jar: adminJar },
    )

    const refreshedEnrollments = requiredRows(
        refreshedEnrollmentsPayload,
        ["enrollments"],
        "/api/enrollments",
    )

    const studentInspection = inspectStudents(
        refreshedEnrollments,
        activeYear,
        classRows,
    )

    if (studentInspection.misplaced.length > 0) {
        throw new Error(
            "Existing performance students are enrolled in unexpected classes. No student records were modified.",
        )
    }

    const studentsByAdmission =
        studentInspection.studentsByAdmission

    const studentRows = []

    for (
        let index = 1;
        index <= STUDENT_COUNT;
        index++
    ) {
        const admissionNumber = studentAdmission(index)

        const expectedClass =
            classRows[expectedClassIndex(index)]

        const existing = studentsByAdmission.get(
            normalized(admissionNumber),
        )

        let studentId

        if (existing) {
            if (
                String(existing.enrollment.classId) !==
                String(expectedClass.id)
            ) {
                throw new Error(
                    `${admissionNumber} is enrolled in an unexpected class. Refusing to modify it.`,
                )
            }

            studentId = existing.student.id
        } else {
            const number = String(index).padStart(4, "0")

            const created = await api(
                "/api/students",
                {
                    method: "POST",
                    jar: adminJar,
                    body: {
                        admissionNumber,
                        firstName: `Student${number}`,
                        middleName: "Test",
                        lastName: `Sample${number}`,
                        dateOfBirth:
                            `201${index % 5}-0${(index % 9) + 1}-15`,
                        gender:
                            index % 2
                                ? "male"
                                : "female",
                        nationality: "Sudanese",
                        phone:
                            `090${String(index).padStart(7, "0")}`,
                        address: "Performance Test Campus",
                        city: "Khartoum",
                        parentName: `Parent ${number}`,
                        parentPhone:
                            `091${String(index).padStart(7, "0")}`,
                        classId: expectedClass.id,
                        notes:
                            "Synthetic performance-test record. Not a real student.",
                    },
                },
            )

            const student = created.data?.student

            if (
                !student?.id ||
                !created.data?.parentId
            ) {
                throw new Error(
                    `Student ${admissionNumber} response was incomplete. Recheck enrollments before resuming.`,
                )
            }

            studentId = student.id

            studentsByAdmission.set(
                normalized(admissionNumber),
                {
                    student,
                    enrollment: {
                        classId: expectedClass.id,
                        academicYearId: activeYear.id,
                    },
                },
            )
        }

        studentRows.push({
            id: studentId,
            admissionNumber,
            classId: expectedClass.id,
        })

        // Durable checkpoint after every student.
        manifest.studentIds = studentRows.map(
            (row) => row.id,
        )

        manifest.counts.students = studentRows.length

        checkpoint()

        if (
            index % 25 === 0 ||
            index === STUDENT_COUNT
        ) {
            progress(
                "Students reconciled",
                index,
                STUDENT_COUNT,
            )
        }
    }

    manifest.counts.students = studentRows.length
    manifest.completed.students = true

    checkpoint()

    // --------------------------------------------------
    // PHASE 8: Final verification
    // --------------------------------------------------

    console.log("\nPHASE 8: Final verification")

    const finalEnrollmentsPayload = await api(
        "/api/enrollments",
        { jar: adminJar },
    )

    const finalEnrollments = requiredRows(
        finalEnrollmentsPayload,
        ["enrollments"],
        "/api/enrollments",
    )

    const finalStudents = inspectStudents(
        finalEnrollments,
        activeYear,
        classRows,
    )

    if (
        finalStudents.existing.length !== STUDENT_COUNT ||
        finalStudents.missing.length !== 0 ||
        finalStudents.misplaced.length !== 0
    ) {
        throw new Error(
            "Final student verification failed.",
        )
    }

    const finalCore = await inspectCoreSubjects(
        adminJar,
        activeYear,
        classRows,
        subjectRows,
    )

    if (finalCore.correct.length !== 6) {
        throw new Error(
            "Final core-subject verification failed.",
        )
    }

    const finalAssignments = await inspectAssignments(
        adminJar,
    )

    if (finalAssignments.assignments.length < 126) {
        throw new Error(
            "Final teacher assignment verification failed.",
        )
    }

    // --------------------------------------------------
    // Final manifest
    // --------------------------------------------------

    manifest.counts.classes = classRows.length
    manifest.counts.subjects = subjectRows.length

    manifest.counts.coreSubjectsPerClass = 6
    manifest.counts.coreSubjectSelections = 36

    manifest.counts.teachers = teacherRows.length
    manifest.counts.teacherAssignments = assignmentCount

    manifest.counts.students = finalStudents.existing.length
    manifest.counts.portalAccounts = 0

    manifest.completed.seed = true

    checkpoint()

    // --------------------------------------------------
    // Result
    // --------------------------------------------------

    console.log("\n========================================")
    console.log("SEED COMPLETE")
    console.log("========================================")

    console.log(
        JSON.stringify(
            manifest.counts,
            null,
            2,
        ),
    )

    console.log(
        `Credentials: ${path.relative(ROOT, CREDENTIALS_FILE)}`,
    )

    console.log(
        `Manifest: ${path.relative(ROOT, MANIFEST_FILE)}`,
    )

    if (manifest.pendingAccounts.length > 0) {
        console.log(
            "\nAccounts requiring password recovery:",
        )

        for (const account of manifest.pendingAccounts) {
            console.log(
                `- ${account.email}: ${account.reason}`,
            )
        }
    }

    console.log("\nNo records were deleted.")

    console.log(
        "Keep local credentials private. Never commit them.",
    )
}

// --------------------------------------------------
// Execution
// --------------------------------------------------

main().catch((error) => {
    console.error("\nSEED STOPPED:", error.message)

    console.error(
        "No automatic rollback was attempted.",
    )

    console.error(
        "Existing records were not deleted.",
    )

    process.exitCode = 1
})