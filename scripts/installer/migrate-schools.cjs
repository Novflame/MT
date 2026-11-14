
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const crypto = require("node:crypto")
const { createRequire } = require("node:module")

const standaloneRoot = path.resolve(__dirname, "..")
const serverPath = path.join(standaloneRoot, "server.js")
const requireFromApp = createRequire(serverPath)

const Database = requireFromApp("better-sqlite3")
const { drizzle } = requireFromApp("drizzle-orm/better-sqlite3")
const { migrate } = requireFromApp("drizzle-orm/better-sqlite3/migrator")

const centralPath = path.resolve(process.env.CENTRAL_DATABASE_PATH || "")
const databaseDirectory = path.resolve(process.env.SCHOOL_DATABASE_DIR || "")
const migrationsFolder = path.join(standaloneRoot, "drizzle", "school")

const lockPath = path.join(databaseDirectory, ".taseety-school-migrations.lock")

function fail(message) {
    throw new Error(message)
}

function verifyIntegrity(sqlite, label) {
    const rows = sqlite.pragma("quick_check")

    if (
        !Array.isArray(rows) ||
        rows.length !== 1 ||
        rows[0].quick_check !== "ok"
    ) {
        fail(`SQLite integrity check failed: ${label}`)
    }
}

/**
 * Mirrors src/db/runtime-migrations.ts exactly.
 * The historical migration remains untouched.
 */
function createCompatibleMigrationsFolder() {
    if (!fs.existsSync(migrationsFolder)) {
        fail(`School migrations folder is missing: ${migrationsFolder}`)
    }

    const temporaryFolder = fs.mkdtempSync(
        path.join(os.tmpdir(), "school-drizzle-migrations-")
    )

    try {
        fs.cpSync(migrationsFolder, temporaryFolder, {
            recursive: true,
        })

        const migrationPath = path.join(
            temporaryFolder,
            "0003_clumsy_darkstar.sql"
        )

        let sql = fs.readFileSync(migrationPath, "utf8")

        const requiredColumns = [
            "admission_number",
            "first_name",
            "middle_name",
            "last_name",
            "date_of_birth",
            "gender",
            "nationality",
            "phone",
            "address",
            "city",
            "created_at",
            "updated_at",
        ]

        for (const column of requiredColumns) {
            const expression = new RegExp(
                "(ALTER TABLE `students` ADD `" +
                    column +
                    "` text) NOT NULL;",
                "g"
            )

            sql = sql.replace(
                expression,
                "$1 NOT NULL DEFAULT '';"
            )
        }

        const indexStatement =
            "CREATE UNIQUE INDEX `students_admission_number_unique`"

       const dataRepair = [
"UPDATE `students` SET `admission_number` = 'LEGACY-' || `id` WHERE `admission_number` = '';",
"--> statement-breakpoint",
"UPDATE `students` SET `first_name` = `name`, `middle_name` = '', `last_name` = '', `gender` = 'unspecified', `nationality` = 'unspecified', `notes` = COALESCE(NULLIF(`notes`, ''), 'Legacy migration: complete missing student details'), `created_at` = CASE WHEN `created_at` = '' THEN datetime('now') ELSE `created_at` END, `updated_at` = CASE WHEN `updated_at` = '' THEN datetime('now') ELSE `updated_at` END;",
"--> statement-breakpoint",
].join("\n") + "\n"

        if (!sql.includes(indexStatement)) {
            fail(
                "Unable to prepare compatibility migration for legacy students"
            )
        }

        sql = sql.replace(
            indexStatement,
            `${dataRepair}${indexStatement}`
        )

        fs.writeFileSync(migrationPath, sql, "utf8")

        return temporaryFolder
    } catch (error) {
        fs.rmSync(temporaryFolder, {
            recursive: true,
            force: true,
        })

        throw error
    }
}

function getRegisteredSchoolIds() {
    if (!fs.existsSync(centralPath)) {
        fail(`Central database is missing: ${centralPath}`)
    }

    const central = new Database(centralPath, {
        readonly: true,
        fileMustExist: true,
    })

    try {
        verifyIntegrity(central, "central database")

        const table = central.prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name = 'schools'
        `).get()

        if (!table) {
            fail("Central database does not contain the schools table")
        }

        return central.prepare(`
            SELECT id
            FROM schools
            ORDER BY id
        `).all().map((row) => {
            const id = Number(row.id)

            if (!Number.isSafeInteger(id) || id < 1) {
                fail(`Invalid registered school ID: ${row.id}`)
            }

            return id
        })
    } finally {
        central.close()
    }
}

function preflightDatabases(schoolIds) {
    if (!fs.existsSync(databaseDirectory)) {
        if (schoolIds.length > 0) {
            fail("School database directory is missing")
        }

        fs.mkdirSync(databaseDirectory, {
            recursive: true,
        })
    }

    const registeredFiles = new Set()

    for (const schoolId of schoolIds) {
        const file = path.join(
            databaseDirectory,
            `school_${schoolId}.db`
        )

        if (!fs.existsSync(file)) {
            fail(
                `Registered school database is missing. Refusing to create it: ${file}`
            )
        }

        registeredFiles.add(`school_${schoolId}.db`)

        const sqlite = new Database(file, {
            readonly: true,
            fileMustExist: true,
        })

        try {
            verifyIntegrity(sqlite, file)
        } finally {
            sqlite.close()
        }
    }

    const unexpectedFiles = fs.readdirSync(databaseDirectory)
        .filter((name) => /^school_\d+\.db$/i.test(name))
        .filter((name) => !registeredFiles.has(name))

    if (unexpectedFiles.length > 0) {
        fail(
            "Unregistered school database files found. Refusing to continue: " +
            unexpectedFiles.join(", ")
        )
    }

    return schoolIds.map((schoolId) => ({
        schoolId,
        file: path.join(
            databaseDirectory,
            `school_${schoolId}.db`
        ),
    }))
}

function migrateSchool(school) {
    console.log(`[school-migrations] Migrating school ${school.schoolId}`)

    const sqlite = new Database(school.file, {
        fileMustExist: true,
    })

    let compatibleFolder

    try {
        sqlite.pragma("busy_timeout = 10000")
        sqlite.pragma("journal_mode = WAL")
        sqlite.pragma("foreign_keys = ON")

        verifyIntegrity(sqlite, school.file)

        compatibleFolder = createCompatibleMigrationsFolder()

        const db = drizzle(sqlite)

        migrate(db, {
            migrationsFolder: compatibleFolder,
        })

        verifyIntegrity(sqlite, school.file)

        console.log(
            `[school-migrations] School ${school.schoolId} migrated and verified`
        )
    } finally {
        if (compatibleFolder) {
            fs.rmSync(compatibleFolder, {
                recursive: true,
                force: true,
            })
        }

        sqlite.close()
    }
}

function main() {
    if (!process.env.CENTRAL_DATABASE_PATH?.trim()) {
        fail("CENTRAL_DATABASE_PATH is not configured")
    }

    if (!process.env.SCHOOL_DATABASE_DIR?.trim()) {
        fail("SCHOOL_DATABASE_DIR is not configured")
    }

    if (!fs.existsSync(serverPath)) {
        fail(`Standalone Next.js server is missing: ${serverPath}`)
    }

    fs.mkdirSync(databaseDirectory, {
        recursive: true,
    })

    try {
        fs.mkdirSync(lockPath)
    } catch (error) {
        if (error.code === "EEXIST") {
            fail(
                "Another school migration process may be running. " +
                "Check the migration lock before retrying."
            )
        }

        throw error
    }

    const lockOwner = {
        pid: process.pid,
        token: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    }

    try {
        fs.writeFileSync(
            path.join(lockPath, "owner.json"),
            JSON.stringify(lockOwner, null, 2),
            { flag: "wx" }
        )

        const schoolIds = getRegisteredSchoolIds()

        console.log(
            `[school-migrations] Registered schools: ${schoolIds.length}`
        )

        const databases = preflightDatabases(schoolIds)

        for (const school of databases) {
            migrateSchool(school)
        }

        console.log(
            `[school-migrations] Successfully verified ${databases.length} school database(s)`
        )
    } finally {
        try {
            const ownerPath = path.join(lockPath, "owner.json")
            const currentOwner = JSON.parse(
                fs.readFileSync(ownerPath, "utf8")
            )

            if (currentOwner.token === lockOwner.token) {
                fs.rmSync(lockPath, {
                    recursive: true,
                    force: true,
                })
            }
        } catch {
            // Preserve an unexpected lock state for manual inspection.
        }
    }
}

main()

