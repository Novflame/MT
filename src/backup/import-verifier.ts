import fs from "node:fs/promises"
import crypto from "node:crypto"
import path from "node:path"

import {
  verifySQLiteDatabase,
} from "./adapters/sqlite"

import type {
  BackupManifest,
} from "./types"

async function sha256File(
  filePath: string,
) {
  const hash =
    crypto.createHash("sha256")

  const file =
    await fs.open(
      filePath,
      "r",
    )

  try {
    const buffer =
      Buffer.allocUnsafe(1024 * 1024)

    while (true) {
      const {
        bytesRead,
      } =
        await file.read(
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
    !value ||
    typeof value !== "object"
  ) {
    return false
  }

  const manifest =
    value as Partial<BackupManifest>

  return (
    manifest.backupVersion === 1 &&
    manifest.format ===
      "school-management-backup" &&
    typeof manifest.appVersion ===
      "string" &&
    typeof manifest.createdAt ===
      "string" &&
    typeof manifest.school ===
      "object" &&
    manifest.school !== null &&
    typeof manifest.school.id ===
      "string" &&
    typeof manifest.school.name ===
      "string" &&
    typeof manifest.database ===
      "object" &&
    manifest.database !== null &&
    manifest.database.provider ===
      "sqlite" &&
    typeof manifest.contents ===
      "object" &&
    manifest.contents !== null &&
    manifest.contents.database ===
      true &&
    typeof manifest.integrity ===
      "object" &&
    manifest.integrity !== null &&
    manifest.integrity.algorithm ===
      "sha256" &&
    typeof manifest.integrity.databaseSha256 ===
      "string"
  )
}

export async function verifyImportedBackup({
  backupDirectory,
  expectedSchoolId,
}: {
  backupDirectory: string
  expectedSchoolId: string
}) {
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

  let manifest: BackupManifest

  try {
    const content =
      await fs.readFile(
        manifestPath,
        "utf8",
      )

    const parsed =
      JSON.parse(content)

    if (!isBackupManifest(parsed)) {
      return {
        valid: false,
        error:
          "Invalid backup manifest",
      }
    }

    manifest = parsed
  } catch {
    return {
      valid: false,
      error:
        "Unable to read backup manifest",
    }
  }

  if (
    manifest.school.id !==
    expectedSchoolId
  ) {
    return {
      valid: false,
      manifest,
      error:
        "Backup belongs to a different school",
    }
  }

  try {
    await fs.access(
      databasePath,
    )
  } catch {
    return {
      valid: false,
      manifest,
      error:
        "Backup database is missing",
    }
  }

  const actualSha256 =
    await sha256File(
      databasePath,
    )

  const checksumMatches =
    actualSha256.toLowerCase() ===
    manifest.integrity.databaseSha256
      .toLowerCase()

  if (!checksumMatches) {
    return {
      valid: false,
      manifest,
      checksum: {
        expected:
          manifest.integrity.databaseSha256,
        actual:
          actualSha256,
      },
      error:
        "Backup database checksum does not match manifest",
    }
  }

  const databaseIntegrity =
    await verifySQLiteDatabase(
      databasePath,
    )

  if (!databaseIntegrity) {
    return {
      valid: false,
      manifest,
      checksum: {
        expected:
          manifest.integrity.databaseSha256,
        actual:
          actualSha256,
      },
      error:
        "Backup database failed SQLite integrity check",
    }
  }

  return {
    valid: true,
    manifest,
    checksum: {
      expected:
        manifest.integrity.databaseSha256,
      actual:
        actualSha256,
    },
    integrity: true,
    error: null,
  }
}