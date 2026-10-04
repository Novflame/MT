import { drizzle } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"

import * as schema from "./centeral-schema"

import fs from "node:fs"
import path from "node:path"

const databasePath =
    process.env.CENTRAL_DATABASE_PATH ??
    path.join(process.cwd(), "central.db")

const databaseDir = path.dirname(databasePath)

if (
    databaseDir &&
    databaseDir !== "."
) {
    fs.mkdirSync(
        databaseDir,
        { recursive: true },
    )
}

const sqlite =
    new Database(databasePath)

sqlite.pragma(
    "journal_mode = WAL",
)

export const centralDb =
    drizzle(sqlite, {
        schema,
    })