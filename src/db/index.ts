import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"
import { eq } from "drizzle-orm"
import { runSchoolMigrations } from "./runtime-migrations"

import path from "node:path"
import fs from "node:fs"
import Database from "better-sqlite3"

import { headers } from "next/headers"
import { auth } from "@/auth/auth"


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



export async function getSchoolDB() {

    // =========================================
    // Authentication
    // =========================================

    const requestHeaders =
        await headers()

    const session =
        await auth.api.getSession({
            headers: requestHeaders,
        })


    if (!session) {
        throw new Error(
            "Unauthorized",
        )
    }



    // =========================================
    // School identity
    // =========================================

    const schoolId =
        session.user.schoolId


    if (!schoolId) {
        throw new Error(
            "Authenticated user is not assigned to a school",
        )
    }


    const cacheKey =
        String(schoolId)



    // =========================================
    // Existing connection
    // =========================================

    const existingConnection =
        connectionCache[cacheKey]


    if (existingConnection) {
        return existingConnection.db
    }



    // =========================================
    // Database directory
    // =========================================

    const dbFolder =
        process.env.SCHOOL_DATABASE_DIR
            ? path.resolve(
                process.env.SCHOOL_DATABASE_DIR,
            )
            : path.join(
                process.cwd(),
                "databases",
            )


    fs.mkdirSync(
        dbFolder,
        {
            recursive: true,
        },
    )



    // =========================================
    // School database path
    // =========================================

    const dbPath =
        path.join(
            dbFolder,
            `school_${schoolId}.db`,
        )



    // =========================================
    // Open SQLite
    // =========================================

    const sqlite =
        new Database(dbPath)


    sqlite.pragma(
        "journal_mode = WAL",
    )


    runSchoolMigrations(
        sqlite,
    )



    // =========================================
    // Create Drizzle instance
    // =========================================

    const db =
        createDB(sqlite)



    // =========================================
    // Cache connection
    // =========================================

    connectionCache[cacheKey] = {
        sqlite,
        db,
    }


    return db
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