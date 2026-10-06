import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

import {
  verifySQLiteDatabase,
} from "./adapters/sqlite"

import type {
  BackupManifest,
} from "./types"


export type BackupVerificationResult = {
  valid: boolean
  id: string
  manifest: BackupManifest | null
  checks: {
    manifest: boolean
    database: boolean
    checksum: boolean
    integrity: boolean
  }
  error: string | null
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


function isBackupManifest(
  value: unknown,
): value is BackupManifest {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false
  }

  const manifest =
    value as Record<string, unknown>

  if (
    manifest.backupVersion !== 1 ||
    manifest.format !==
      "school-management-backup" ||
    typeof manifest.appVersion !==
      "string" ||
    typeof manifest.createdAt !==
      "string"
  ) {
    return false
  }

  const school =
    manifest.school

  if (
    typeof school !== "object" ||
    school === null
  ) {
    return false
  }

  const schoolData =
    school as Record<string, unknown>

  if (
    typeof schoolData.id !==
      "string" ||
    typeof schoolData.name !==
      "string"
  ) {
    return false
  }

  const database =
    manifest.database

  if (
    typeof database !==
      "object" ||
    database === null
  ) {
    return false
  }

  const databaseData =
    database as Record<string, unknown>

  if (
    databaseData.provider !==
      "sqlite"
  ) {
    return false
  }

  const migration =
    databaseData.migration

  if (
    migration !== null &&
    (
      typeof migration !==
        "object" ||
      migration === null
    )
  ) {
    return false
  }

  if (migration !== null) {
    const migrationData =
      migration as Record<string, unknown>

    if (
      typeof migrationData.hash !==
        "string" ||
      typeof migrationData.createdAt !==
        "number"
    ) {
      return false
    }
  }

  const contents =
    manifest.contents

  if (
    typeof contents !==
      "object" ||
    contents === null
  ) {
    return false
  }

  const contentsData =
    contents as Record<string, unknown>

  if (
    contentsData.database !==
      true ||
    typeof contentsData.files !==
      "boolean"
  ) {
    return false
  }

  const integrity =
    manifest.integrity

  if (
    typeof integrity !==
      "object" ||
    integrity === null
  ) {
    return false
  }

  const integrityData =
    integrity as Record<string, unknown>

  if (
    integrityData.algorithm !==
      "sha256" ||
    typeof integrityData.databaseSha256 !==
      "string"
  ) {
    return false
  }

  return true
}


export async function verifySchoolBackup(
  backupDirectory: string,
): Promise<BackupVerificationResult> {

  const id =
    path.basename(
      backupDirectory,
    )

  const manifestPath =
    path.join(
      backupDirectory,
      "manifest.json",
    )

  const databasePath =
    path.join(
      backupDirectory,
      "database",
      "school.db",
    )

  const checks = {
    manifest: false,
    database: false,
    checksum: false,
    integrity: false,
  }

  try {
    // ------------------------------------------
    // 1. Manifest
    // ------------------------------------------

    if (
      !(await fileExists(
        manifestPath,
      ))
    ) {
      throw new Error(
        "Backup manifest is missing",
      )
    }

    const manifestContent =
      await fs.readFile(
        manifestPath,
        "utf8",
      )

    let parsedManifest: unknown

    try {
      parsedManifest =
        JSON.parse(
          manifestContent,
        )
    } catch {
      throw new Error(
        "Backup manifest contains invalid JSON",
      )
    }

    if (
      !isBackupManifest(
        parsedManifest,
      )
    ) {
      throw new Error(
        "Backup manifest structure is invalid",
      )
    }

    const manifest =
      parsedManifest

    checks.manifest = true

    // ------------------------------------------
    // 2. Database file
    // ------------------------------------------

    if (
      !(await fileExists(
        databasePath,
      ))
    ) {
      throw new Error(
        "Backup database is missing",
      )
    }

    checks.database = true

    // ------------------------------------------
    // 3. SHA-256
    // ------------------------------------------

    const actualSha256 =
      await sha256File(
        databasePath,
      )

    if (
      actualSha256.toLowerCase() !==
      manifest.integrity.databaseSha256.toLowerCase()
    ) {
      throw new Error(
        "Backup database checksum does not match the manifest",
      )
    }

    checks.checksum = true

    // ------------------------------------------
    // 4. SQLite integrity
    // ------------------------------------------

    const databaseIsValid =
      await verifySQLiteDatabase(
        databasePath,
      )

    if (!databaseIsValid) {
      throw new Error(
        "Backup database integrity check failed",
      )
    }

    checks.integrity = true

    return {
      valid: true,
      id,
      manifest,
      checks,
      error: null,
    }

  } catch (error) {

    return {
      valid: false,
      id,
      manifest: null,
      checks,
      error:
        error instanceof Error
          ? error.message
          : "Backup verification failed",
    }
  }
}