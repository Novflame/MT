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
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as { contents?: { files?: boolean } }

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

  if (manifest.contents?.files) {
    const filesRoot = path.join(backupDirectory, "files")
    const walk = async (directory: string): Promise<void> => {
      const entries = await fs.readdir(directory, { withFileTypes: true })
      for (const entry of entries) {
        const absolute = path.join(directory, entry.name)
        if (entry.isSymbolicLink()) throw new Error("Symbolic links are not allowed in backup files")
        if (entry.isDirectory()) await walk(absolute)
        else if (entry.isFile()) zip.addFile(absolute, path.relative(backupDirectory, absolute).split(path.sep).join("/"))
      }
    }
    await walk(filesRoot)
  }

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