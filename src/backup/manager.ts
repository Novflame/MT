
import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

import Database from "better-sqlite3"

import {
  getSchoolMigrationMetadata,
} from "@/db/runtime-migrations"

import {
  createSQLiteBackup,
  verifySQLiteDatabase,
} from "./adapters/sqlite"

import {
  ensureBackupDirectory,
  getSchoolDatabasePath,
} from "./registry"

import type {
  BackupManifest,
  BackupResult,
} from "./types"
import {
  verifySchoolBackup,
} from "./verifier"

const APP_VERSION = "1.0.0"


function createBackupId() {
  return `${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}-${crypto
    .randomBytes(6)
    .toString("hex")}`
}


async function sha256File(
  filePath: string,
) {
  const hash =
    crypto.createHash("sha256")

  const file =
    await fs.open(filePath, "r")

  try {

    const buffer =
      Buffer.alloc(1024 * 1024)

    while (true) {

      const {
        bytesRead,
      } = await file.read(
        buffer,
        0,
        buffer.length,
        null,
      )

      if (bytesRead === 0) {
        break
      }

      hash.update(
        buffer.subarray(
          0,
          bytesRead,
        ),
      )
    }

  } finally {

    await file.close()
  }

  return hash.digest("hex")
}


async function fileExists(
  filePath: string,
) {
  try {

    await fs.access(filePath)

    return true

  } catch {

    return false
  }
}


export async function createSchoolBackup({
  schoolId,
  schoolName,
}: {
  schoolId: string
  schoolName: string
}): Promise<BackupResult> {

  // --------------------------------------------------
  // 1. Resolve the source database
  // --------------------------------------------------

  const sourcePath =
    getSchoolDatabasePath(schoolId)


  // --------------------------------------------------
  // 2. Read actual Drizzle migration metadata
  // --------------------------------------------------

  const sqlite =
    new Database(sourcePath, {
      readonly: true,
      fileMustExist: true,
    })

  let migrationMetadata

  try {

    migrationMetadata =
      getSchoolMigrationMetadata(
        sqlite,
      )

  } finally {

    sqlite.close()
  }


  // --------------------------------------------------
  // 3. Create backup identifiers and paths
  // --------------------------------------------------

  const backupId =
    createBackupId()

  const backupDirectory =
    ensureBackupDirectory(
      schoolId,
    )

  const temporaryDirectory =
    path.join(
      backupDirectory,
      `.tmp-${backupId}`,
    )

  const finalDirectory =
    path.join(
      backupDirectory,
      backupId,
    )


  const temporaryDatabasePath =
    path.join(
      temporaryDirectory,
      "database",
      "school.db",
    )

  const temporaryManifestPath =
    path.join(
      temporaryDirectory,
      "manifest.json",
    )


  const finalDatabaseDirectory =
    path.join(
      finalDirectory,
      "database",
    )

  const finalDatabasePath =
    path.join(
      finalDatabaseDirectory,
      "school.db",
    )

  const finalManifestPath =
    path.join(
      finalDirectory,
      "manifest.json",
    )


  try {

    // --------------------------------------------------
    // 4. Create SQLite snapshot
    // --------------------------------------------------

    await fs.mkdir(
      path.dirname(
        temporaryDatabasePath,
      ),
      {
        recursive: true,
      },
    )


    await createSQLiteBackup({
      sourcePath,
      destinationPath:
        temporaryDatabasePath,
    })


    // --------------------------------------------------
    // 5. Verify SQLite integrity
    // --------------------------------------------------

    const databaseIsValid =
      await verifySQLiteDatabase(
        temporaryDatabasePath,
      )


    if (!databaseIsValid) {

      throw new Error(
        "Backup database integrity check failed",
      )
    }


    // --------------------------------------------------
    // 6. Calculate SHA-256
    // --------------------------------------------------

    const databaseSha256 =
      await sha256File(
        temporaryDatabasePath,
      )


    // --------------------------------------------------
    // 7. Build manifest
    // --------------------------------------------------

    const manifest: BackupManifest = {
      backupVersion: 1,

      format:
        "school-management-backup",

      appVersion:
        APP_VERSION,

      createdAt:
        new Date().toISOString(),

      school: {
        id: schoolId,
        name: schoolName,
      },

      database: {
        provider: "sqlite",

        migration:
          migrationMetadata,
      },

      contents: {
        database: true,
        files: false,
      },

      integrity: {
        algorithm: "sha256",

        databaseSha256:
          databaseSha256,
      },
    }


    // --------------------------------------------------
    // 8. Write manifest
    // --------------------------------------------------

    await fs.writeFile(
      temporaryManifestPath,
      JSON.stringify(
        manifest,
        null,
        2,
      ),
      "utf8",
    )


    // --------------------------------------------------
    // 9. Verify temporary package
    // --------------------------------------------------

    const databaseExists =
      await fileExists(
        temporaryDatabasePath,
      )

    const manifestExists =
      await fileExists(
        temporaryManifestPath,
      )


    if (
      !databaseExists ||
      !manifestExists
    ) {

      throw new Error(
        "Backup package is incomplete",
      )
    }


    // --------------------------------------------------
    // 10. Create final package directory
    //
    // Do not rename the directory itself.
    // This avoids Windows EPERM problems.
    // --------------------------------------------------

    await fs.mkdir(
      finalDatabaseDirectory,
      {
        recursive: true,
      },
    )


    // --------------------------------------------------
    // 11. Move individual files
    // --------------------------------------------------

    await fs.rename(
      temporaryDatabasePath,
      finalDatabasePath,
    )

    await fs.rename(
      temporaryManifestPath,
      finalManifestPath,
    )


    // --------------------------------------------------
    // 12. Remove temporary directory
    // --------------------------------------------------

    await fs.rm(
      temporaryDirectory,
      {
        recursive: true,
        force: true,
      },
    )


    // --------------------------------------------------
    // 13. Final package verification
    // --------------------------------------------------

    const finalDatabaseExists =
      await fileExists(
        finalDatabasePath,
      )

    const finalManifestExists =
      await fileExists(
        finalManifestPath,
      )


    if (
      !finalDatabaseExists ||
      !finalManifestExists
    ) {

      throw new Error(
        "Final backup package is incomplete",
      )
    }


    // --------------------------------------------------
    // 14. Return result
    // --------------------------------------------------

    return {
      id: backupId,

      path:
        finalDirectory,

      manifest,
    }

  } catch (error) {

    await fs.rm(
      temporaryDirectory,
      {
        recursive: true,
        force: true,
      },
    )

    await fs.rm(
      finalDirectory,
      {
        recursive: true,
        force: true,
      },
    )

    throw error
  }
}

export async function createEmergencySchoolBackup({
  schoolId,
}: {
  schoolId: string
}): Promise<string> {
  const sourcePath =
    getSchoolDatabasePath(schoolId)

  const emergencyDirectory =
    path.join(
      ensureBackupDirectory(schoolId),
      "pre-restore",
    )

  const backupId =
    `pre-restore-${createBackupId()}`

  const backupDirectory =
    path.join(
      emergencyDirectory,
      backupId,
    )

  const databasePath =
    path.join(
      backupDirectory,
      "database",
      "school.db",
    )

  const manifestPath =
    path.join(
      backupDirectory,
      "manifest.json",
    )

  const sqlite =
    new Database(sourcePath, {
      readonly: true,
      fileMustExist: true,
    })

  let migrationMetadata

  try {
    migrationMetadata =
      getSchoolMigrationMetadata(
        sqlite,
      )
  } finally {
    sqlite.close()
  }

  try {
    await fs.mkdir(
      path.dirname(databasePath),
      {
        recursive: true,
      },
    )

    await createSQLiteBackup({
      sourcePath,
      destinationPath:
        databasePath,
    })

    const databaseIsValid =
      await verifySQLiteDatabase(
        databasePath,
      )

    if (!databaseIsValid) {
      throw new Error(
        "Emergency backup database integrity check failed",
      )
    }

    const databaseSha256 =
      await sha256File(
        databasePath,
      )

    const manifest: BackupManifest = {
      backupVersion: 1,
      format:
        "school-management-backup",
      appVersion:
        APP_VERSION,
      createdAt:
        new Date().toISOString(),
      school: {
        id: schoolId,
        name: `Emergency pre-restore backup`,
      },
      database: {
        provider: "sqlite",
        migration:
          migrationMetadata,
      },
      contents: {
        database: true,
        files: false,
      },
      integrity: {
        algorithm: "sha256",
        databaseSha256:
          databaseSha256,
      },
    }

    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        manifest,
        null,
        2,
      ),
      "utf8",
    )

    const verification =
      await verifySchoolBackup(
        backupDirectory,
      )

    if (!verification.valid) {
      throw new Error(
        verification.error ??
          "Emergency backup verification failed",
      )
    }

    return backupDirectory
  } catch (error) {
    await fs.rm(
      backupDirectory,
      {
        recursive: true,
        force: true,
      },
    )

    throw error
  }
}