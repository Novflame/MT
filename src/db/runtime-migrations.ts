
import Database from "better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "@/db/schema"

export function runSchoolMigrations(
    sqlite: Database.Database,
) {
    const db = drizzle(sqlite, {
        schema,
    })

    migrate(db, {
        migrationsFolder :"./drizzle/school",
    })
}

