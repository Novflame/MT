import Database from "better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "@/db/schema"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle/school")

/**
 * Keep the historical migration immutable while making it safe for populated legacy
 * databases. The temporary copy only changes how migration 0003 supplies required
 * fields when the legacy students table already contains rows. Existing databases
 * that already recorded 0003 skip it normally; migration 0006 normalizes exam types.
 */
function createCompatibleMigrationsFolder() {
    const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), "school-drizzle-migrations-"))
    fs.cpSync(MIGRATIONS_FOLDER, temporaryFolder, { recursive: true })

    const migrationPath = path.join(temporaryFolder, "0003_clumsy_darkstar.sql")
    let sql = fs.readFileSync(migrationPath, "utf8")

    const requiredColumns = [
        "admission_number", "first_name", "middle_name", "last_name",
        "date_of_birth", "gender", "nationality", "phone", "address",
        "city", "created_at", "updated_at",
    ]
    for (const column of requiredColumns) {
        const expression = new RegExp("(ALTER TABLE `students` ADD `" + column + "` text) NOT NULL;", "g")
        sql = sql.replace(expression, "$1 NOT NULL DEFAULT '';")
    }

    const indexStatement = "CREATE UNIQUE INDEX `students_admission_number_unique`"
    // Drizzle's SQLite migrator prepares one SQL statement per segment. Keep a
    // breakpoint between both repairs; otherwise it rejects the combined SQL.
    const dataRepair = [
        "UPDATE `students` SET `admission_number` = 'LEGACY-' || `id` WHERE `admission_number` = '';",
        "--> statement-breakpoint",
        "UPDATE `students` SET `first_name` = `name`, `middle_name` = '', `last_name` = '', `gender` = 'unspecified', `nationality` = 'unspecified', `notes` = COALESCE(NULLIF(`notes`, ''), 'Legacy migration: complete missing student details'), `created_at` = CASE WHEN `created_at` = '' THEN datetime('now') ELSE `created_at` END, `updated_at` = CASE WHEN `updated_at` = '' THEN datetime('now') ELSE `updated_at` END;",
        "--> statement-breakpoint",
    ].join("\n") + "\n"
    if (!sql.includes(indexStatement)) {
        fs.rmSync(temporaryFolder, { recursive: true, force: true })
        throw new Error("Unable to prepare compatibility migration for legacy students")
    }
    sql = sql.replace(indexStatement, `${dataRepair}${indexStatement}`)
    fs.writeFileSync(migrationPath, sql, "utf8")
    return temporaryFolder
}

export function runSchoolMigrations(sqlite: Database.Database) {
    const db = drizzle(sqlite, { schema })
    const compatibleFolder = createCompatibleMigrationsFolder()
    try {
        migrate(db, { migrationsFolder: compatibleFolder })
    } finally {
        fs.rmSync(compatibleFolder, { recursive: true, force: true })
    }
}

export type SchoolMigrationMetadata = {
    hash: string
    createdAt: number
}

export function getSchoolMigrationMetadata(sqlite: Database.Database): SchoolMigrationMetadata | null {
    const tableExists = sqlite.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name = '__drizzle_migrations'
    `).get()
    if (!tableExists) return null

    const latestMigration = sqlite.prepare(`
        SELECT hash, created_at FROM __drizzle_migrations
        ORDER BY created_at DESC LIMIT 1
    `).get() as { hash: string; created_at: number } | undefined

    if (!latestMigration) return null
    return { hash: latestMigration.hash, createdAt: latestMigration.created_at }
}
