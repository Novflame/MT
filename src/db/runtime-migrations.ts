import Database from "better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "@/db/schema"

const MIGRATIONS_FOLDER =
    "./drizzle/school"


export function runSchoolMigrations(
    sqlite: Database.Database,
) {
    const db = drizzle(sqlite, {
        schema,
    })

    migrate(db, {
        migrationsFolder: MIGRATIONS_FOLDER,
    })
}


export type SchoolMigrationMetadata = {
    hash: string
    createdAt: number
}


export function getSchoolMigrationMetadata(
    sqlite: Database.Database,
): SchoolMigrationMetadata | null {

    const tableExists = sqlite
        .prepare(
            `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = '__drizzle_migrations'
            `,
        )
        .get()


    if (!tableExists) {
        return null
    }


    const latestMigration = sqlite
        .prepare(
            `
            SELECT hash, created_at
            FROM __drizzle_migrations
            ORDER BY created_at DESC
            LIMIT 1
            `,
        )
        .get() as
        | {
            hash: string
            created_at: number
        }
        | undefined


    if (!latestMigration) {
        return null
    }


    return {
        hash: latestMigration.hash,
        createdAt: latestMigration.created_at,
    }
}