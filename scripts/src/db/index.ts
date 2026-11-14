import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"
import { eq } from "drizzle-orm"
import { runSchoolMigrations } from "./runtime-migrations"

import fs from "node:fs"
import Database from "better-sqlite3"

import { headers } from "next/headers"
import { getRequestSession } from "@/auth/session"
import { getSchoolDatabasePath } from "@/db/database-path"
import { centralDb } from "@/db/central"
import { user as centralUser, schools as centralSchools } from "@/db/centeral-schema"


function createDB(
    sqlite: Database.Database,
) {
    return drizzle(sqlite, {
        schema,
    })
}


export type SchoolDB =
    ReturnType<typeof createDB>


type SchoolConnection = {
    sqlite: Database.Database
    db: SchoolDB
}


const connectionCache:
    Record<string, SchoolConnection> = {}

    const schoolMaintenanceLocks = new Set<string>()



export async function getSchoolDB() {

    // =========================================
    // Authentication
    // =========================================

    const requestHeaders =
        await headers()

    const session = await getRequestSession(requestHeaders)


    if (!session) {
        throw new Error(
            "Unauthorized",
        )
    }



    // =========================================
    // School identity
    // =========================================

    // Resolve the tenant from the central database, not from request parameters or
    // an unverified client value. Do not silently create a database for stale IDs.
    const centralRecord = await centralDb
        .select({ schoolId: centralUser.schoolId })
        .from(centralUser)
        .innerJoin(centralSchools, eq(centralUser.schoolId, centralSchools.id))
        .where(eq(centralUser.id, session.user.id))
        .limit(1)

    const schoolId = centralRecord[0]?.schoolId
    if (!schoolId) {
        throw new Error("Authenticated user is not assigned to a valid school")
    }

    if (String(session.user.schoolId ?? "") !== String(schoolId)) {
        throw new Error("Authenticated session school does not match the central account")
    }

    return getSchoolDBForSystemTask(schoolId)
}

/**
 * Opens a school database for trusted server-side jobs only. Never pass a school id
 * supplied by a request; normal request handlers must use getSchoolDB().
 */
export async function getSchoolDBForSystemTask(schoolId: string | number) {
    const normalizedSchoolId = String(schoolId)
    const cacheKey = normalizedSchoolId
    const existingConnection = connectionCache[cacheKey]

    if (schoolMaintenanceLocks.has(normalizedSchoolId)) {
    throw new Error(
        `School database is temporarily unavailable for maintenance`,
    )
}
    if (existingConnection) return existingConnection.db

    const dbPath = getSchoolDatabasePath(normalizedSchoolId)
    if (!fs.existsSync(dbPath)) {
        throw new Error(`School database is missing for school ${normalizedSchoolId}; refusing to create an empty tenant database`)
    }
    const sqlite = new Database(dbPath, { fileMustExist: true })
    sqlite.pragma("journal_mode = WAL")
    sqlite.pragma("foreign_keys = ON")

    try {
        runSchoolMigrations(sqlite)
        const db = createDB(sqlite)
        connectionCache[cacheKey] = { sqlite, db }
        return db
    } catch (error) {
        sqlite.close()
        throw error
    }
}



export function closeSchoolDB(
    schoolId: string,
) {

    const connection =
        connectionCache[
            String(schoolId)
        ]


    if (!connection) {
        return
    }


    connection.sqlite.close()


    delete connectionCache[
        String(schoolId)
    ]
}



export function hasSchoolDBConnection(
    schoolId: string,
) {

    return Boolean(
        connectionCache[
            String(schoolId)
        ],
    )
}



export async function getActiveAcademicYear() {

    const db =
        await getSchoolDB()


    const academicYear =
        await db.query.academicYears.findFirst({
            where: eq(
                schema.academicYears.isActive,
                true,
            ),
        })


    if (!academicYear) {
        throw new Error(
            "No active academic year",
        )
    }


    return academicYear
}
export function beginSchoolDBMaintenance(
    schoolId: string | number,
) {
    const normalizedSchoolId = String(schoolId)

    if (schoolMaintenanceLocks.has(normalizedSchoolId)) {
        throw new Error("School database maintenance is already running")
    }

    schoolMaintenanceLocks.add(normalizedSchoolId)

    try {
        closeSchoolDB(normalizedSchoolId)
    } catch (error) {
        schoolMaintenanceLocks.delete(normalizedSchoolId)
        throw error
    }
}

export function endSchoolDBMaintenance(
    schoolId: string | number,
) {
    schoolMaintenanceLocks.delete(String(schoolId))
}