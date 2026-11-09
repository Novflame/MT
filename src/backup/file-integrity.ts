import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** Hashes both relative file names and file contents, independent of directory traversal order. */
export async function sha256Directory(directoryPath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const files: string[] = [];

  try {
    async function walk(current: string) {
      const entries = await fs.readdir(current, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const absolute = path.join(current, entry.name);
        if (entry.isSymbolicLink())
          throw new Error(
            "Symbolic links are not allowed in backup file trees",
          );
        if (entry.isDirectory()) await walk(absolute);
        else if (entry.isFile()) files.push(absolute);
      }
    }
    await walk(directoryPath);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return crypto.createHash("sha256").update("").digest("hex");
    }
    throw error;
  }

  files.sort((a, b) =>
    path
      .relative(directoryPath, a)
      .localeCompare(path.relative(directoryPath, b)),
  );
  for (const file of files) {
    const relative = path
      .relative(directoryPath, file)
      .split(path.sep)
      .join("/");
    const content = await fs.readFile(file);
    hash.update(relative);
    hash.update("\0");
    hash.update(crypto.createHash("sha256").update(content).digest("hex"));
    hash.update("\n");
  }
  return hash.digest("hex");
}
