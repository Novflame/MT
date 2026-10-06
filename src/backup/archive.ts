import fs from "node:fs/promises"
import path from "node:path"

import yazl from "yazl"


export async function createBackupArchive({
  backupDirectory,
  destinationPath,
}: {
  backupDirectory: string
  destinationPath: string
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

  await fs.access(
    manifestPath,
  )

  await fs.access(
    databasePath,
  )

  await fs.mkdir(
    path.dirname(destinationPath),
    {
      recursive: true,
    },
  )

  const zip =
    new yazl.ZipFile()

  zip.addFile(
    manifestPath,
    "manifest.json",
  )

  zip.addFile(
    databasePath,
    "database/school.db",
  )

  const output =
    await fs.open(
      destinationPath,
      "w",
    )

  try {
    await new Promise<void>(
      (resolve, reject) => {
        zip.outputStream
          .pipe(
            output.createWriteStream(),
          )
          .on("close", resolve)
          .on("error", reject)

        zip.end()
      },
    )
  } finally {
    await output.close()
  }
}