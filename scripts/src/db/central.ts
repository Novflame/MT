import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"

import * as schema from "./centeral-schema"

import fs from "node:fs"
import path from "node:path"

const configuredPath = process.env.CENTRAL_DATABASE_PATH?.trim()

const databasePath = configuredPath
? path.resolve(configuredPath)
: path.join(process.cwd(), "central.db")

const databaseDir = path.dirname(databasePath)

fs.mkdirSync(databaseDir, { recursive: true })

const sqlite = new Database(databasePath, {
timeout: 5000,
})

// Wait briefly for another connection to finish its transaction.
sqlite.pragma("busy_timeout = 5000")

// Do not change journal_mode during module initialization.
// Multiple Next.js build workers may import this module concurrently.

sqlite.pragma("foreign_keys = ON")

export const centralDb = drizzle(sqlite, {
schema,
})
