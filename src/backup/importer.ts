import fs from "node:fs/promises"
import path from "node:path"

import AdmZip from "adm-zip"

const REQUIRED_ENTRIES = [
  "manifest.json",
  "database/school.db",
]

function isSafeArchivePath(entryName: string) {
  const normalized = entryName.replaceAll("\\", "/")

  if (
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

function isRequiredEntry(entryName: string) {
  return REQUIRED_ENTRIES.includes(
    entryName.replaceAll("\\", "/"),
  )
}

export async function importBackupArchive({
  archivePath,
  destinationDirectory,
}: {
  archivePath: string
  destinationDirectory: string
}) {
  const temporaryDirectory =
    `${destinationDirectory}.tmp-${Date.now()}`

  await fs.mkdir(
    temporaryDirectory,
    {
      recursive: true,
    },
  )

  try {
    const zip =
      new AdmZip(archivePath)

    const entries =
      zip.getEntries()

    for (const entry of entries) {
      const entryName =
        entry.entryName.replaceAll("\\", "/")

      if (!isSafeArchivePath(entryName)) {
        throw new Error(
          "Backup archive contains an unsafe path",
        )
      }
    }

    const entryNames =
      new Set(
        entries
          .filter(
            (entry) =>
              !entry.isDirectory,
          )
          .map(
            (entry) =>
              entry.entryName.replaceAll(
                "\\",
                "/",
              ),
          ),
      )

    for (const requiredEntry of REQUIRED_ENTRIES) {
      if (!entryNames.has(requiredEntry)) {
        throw new Error(
          `Backup archive is missing required file: ${requiredEntry}`,
        )
      }
    }

    for (const entry of entries) {
      const entryName =
        entry.entryName.replaceAll("\\", "/")

      if (!isRequiredEntry(entryName)) {
        continue
      }

      const outputPath =
        path.join(
          temporaryDirectory,
          entryName,
        )

      await fs.mkdir(
        path.dirname(outputPath),
        {
          recursive: true,
        },
      )

      await fs.writeFile(
        outputPath,
        entry.getData(),
      )
    }

    await fs.access(
      path.join(
        temporaryDirectory,
        "manifest.json",
      ),
    )

    await fs.access(
      path.join(
        temporaryDirectory,
        "database",
        "school.db",
      ),
    )

   await fs.rm(
  destinationDirectory,
  {
    recursive: true,
    force: true,
  },
)

await fs.mkdir(
  destinationDirectory,
  {
    recursive: true,
  },
)

const manifestSource =
  path.join(
    temporaryDirectory,
    "manifest.json",
  )

const databaseSource =
  path.join(
    temporaryDirectory,
    "database",
    "school.db",
  )

const manifestDestination =
  path.join(
    destinationDirectory,
    "manifest.json",
  )

const databaseDirectory =
  path.join(
    destinationDirectory,
    "database",
  )

const databaseDestination =
  path.join(
    databaseDirectory,
    "school.db",
  )

await fs.mkdir(
  databaseDirectory,
  {
    recursive: true,
  },
)

await fs.rename(
  manifestSource,
  manifestDestination,
)

await fs.rename(
  databaseSource,
  databaseDestination,
)

await fs.rm(
  temporaryDirectory,
  {
    recursive: true,
    force: true,
  },
)

    return {
      destinationDirectory,
      manifestPath:
        path.join(
          destinationDirectory,
          "manifest.json",
        ),
      databasePath:
        path.join(
          destinationDirectory,
          "database",
          "school.db",
        ),
    }
  } catch (error) {
    await fs.rm(
      temporaryDirectory,
      {
        recursive: true,
        force: true,
      },
    )

    throw error
  }
}