import Database from "better-sqlite3"
import fs from "node:fs/promises"
import path from "node:path"

export type SQLiteBackupOptions = {
  sourcePath: string
  destinationPath: string
}

export async function createSQLiteBackup({
  sourcePath,
  destinationPath,
}: SQLiteBackupOptions) {
  await fs.mkdir(path.dirname(destinationPath), {
    recursive: true,
  })

  const source = new Database(sourcePath, {
    readonly: true,
    fileMustExist: true,
  })

  try {
    await source.backup(destinationPath)
  } finally {
    source.close()
  }
}

export async function verifySQLiteDatabase(
  databasePath: string,
) {
  const db = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  })

  try {
    const result = db
      .prepare("PRAGMA integrity_check")
      .pluck()
      .get()

    return result === "ok"
  } finally {
    db.close()
  }
}
export async function restoreSQLiteBackup({
  backupPath,
  destinationPath,
}: {
  backupPath: string
  destinationPath: string
}) {
  const source =
    new Database(backupPath, {
      readonly: true,
      fileMustExist: true,
    })

  try {
    await fs.mkdir(
      path.dirname(destinationPath),
      {
        recursive: true,
      },
    )

    await source.backup(
      destinationPath,
    )
  } finally {
    source.close()
  }
}