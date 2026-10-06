import path from "node:path"
import fs from "node:fs"

export function getBackupRoot() {
  const configured =
    process.env.BACKUP_DIRECTORY?.trim()

  return configured
    ? path.resolve(configured)
    : path.join(process.cwd(), "backups")
}

export function getSchoolBackupDirectory(
  schoolId: string,
) {
  return path.join(
    getBackupRoot(),
    "schools",
    schoolId,
  )
}

export function getSchoolDatabasePath(
  schoolId: string,
) {
  const dbFolder =
    process.env.SCHOOL_DATABASE_DIR
      ? path.resolve(process.env.SCHOOL_DATABASE_DIR)
      : path.join(process.cwd(), "databases")

  return path.join(
    dbFolder,
    `school_${schoolId}.db`,
  )
}

export function ensureBackupDirectory(
  schoolId: string,
) {
  const directory =
    getSchoolBackupDirectory(schoolId)

  fs.mkdirSync(directory, {
    recursive: true,
  })

  return directory
}
