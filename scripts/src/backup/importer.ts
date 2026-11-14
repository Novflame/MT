import fs from "node:fs/promises"
import path from "node:path"
import AdmZip from "adm-zip"
import { verifySchoolBackup } from "./verifier"

const REQUIRED_ENTRIES = [
  "manifest.json",
  "database/school.db",
]

function isSafeArchivePath(entryName: string) {
  const normalized = entryName.replaceAll("\\", "/")

  if (
    /^[A-Za-z]:/.test(normalized) ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized === ".." ||
    normalized.includes("\0")
  ) {
    return false
  }

  return true
}

function isAllowedEntry(entryName: string) {
  const normalized = entryName.replaceAll("\\", "/")
  return REQUIRED_ENTRIES.includes(normalized) || /^files\/schools\/[1-9]\d*\//.test(normalized)
}
export async function importBackupArchive({
  archivePath,
  destinationDirectory,
  expectedSchoolId,
}: {
  archivePath: string
  destinationDirectory: string
  expectedSchoolId: string
}) {
  const parentDirectory = path.dirname(destinationDirectory)

  await fs.mkdir(parentDirectory, { recursive: true })

  // Never overwrite an existing backup.
  try {
    await fs.access(destinationDirectory)
    throw new Error("Backup destination already exists")
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Backup destination already exists"
    ) {
      throw error
    }

    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error
    }
  }

  const temporaryDirectory = await fs.mkdtemp(
    path.join(parentDirectory, ".import-"),
  )

  try {
    const zip = new AdmZip(archivePath)
    const entries = zip.getEntries()

    const MAX_ENTRIES = 10_000
    const MAX_FILE_SIZE = 512 * 1024 * 1024
    const MAX_TOTAL_SIZE = 1024 * 1024 * 1024

    if (entries.length > MAX_ENTRIES) {
      throw new Error("Backup archive contains too many entries")
    }

    const seenPaths = new Set<string>()
    let totalSize = 0

    for (const entry of entries) {
      const entryName = entry.entryName.replaceAll("\\", "/")

      if (!isSafeArchivePath(entryName)) {
        throw new Error("Backup archive contains an unsafe path")
      }

      if (entry.isDirectory) continue

      if (seenPaths.has(entryName)) {
        throw new Error("Backup archive contains duplicate paths")
      }

      seenPaths.add(entryName)

      const size = entry.header.size

      if (
        !Number.isSafeInteger(size) ||
        size < 0 ||
        size > MAX_FILE_SIZE
      ) {
        throw new Error("Backup archive contains an oversized file")
      }

      totalSize += size

      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error("Backup archive exceeds the maximum allowed size")
      }
    }

    const entryNames = new Set(seenPaths)

    for (const requiredEntry of REQUIRED_ENTRIES) {
      if (!entryNames.has(requiredEntry)) {
        throw new Error(
          `Backup archive is missing required file: ${requiredEntry}`,
        )
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory) continue

      const entryName = entry.entryName.replaceAll("\\", "/")

      if (!isAllowedEntry(entryName)) continue

      const outputPath = path.resolve(temporaryDirectory, entryName)
      const relativePath = path.relative(
        temporaryDirectory,
        outputPath,
      )

      if (
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath)
      ) {
        throw new Error("Backup archive contains an unsafe destination")
      }

      await fs.mkdir(path.dirname(outputPath), {
        recursive: true,
      })

      await fs.writeFile(outputPath, entry.getData(), {
        flag: "wx",
      })
    }

    // Verify the extracted package before it enters backup history.
    const verification = await verifySchoolBackup(
      temporaryDirectory,
      expectedSchoolId,
    )

    if (!verification.valid || !verification.manifest) {
      throw new Error(
        verification.error || "Imported backup verification failed",
      )
    }

    // Ensure the destination has not appeared during extraction.
    try {
      await fs.access(destinationDirectory)
      throw new Error("Backup destination already exists")
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Backup destination already exists"
      ) {
        throw error
      }

      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error
      }
    }

    // Same-parent rename: publish only the fully verified directory.
    await fs.rename(temporaryDirectory, destinationDirectory)

    return {
      destinationDirectory,
      manifestPath: path.join(destinationDirectory, "manifest.json"),
      databasePath: path.join(
        destinationDirectory,
        "database",
        "school.db",
      ),
    }
  } catch (error) {
    await fs.rm(temporaryDirectory, {
      recursive: true,
      force: true,
    })

    throw error
  }
}