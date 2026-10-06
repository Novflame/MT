import fs from "node:fs/promises"
import path from "node:path"

import { requirePermission } from "@/auth/session"
import { getSchoolBackupDirectory } from "@/backup/registry"
import type { BackupManifest } from "@/backup/types"

import BackupSettingsClient from "./BackupSettingsClient"

type BackupHistoryItem = {
id: string
createdAt: string
school: BackupManifest["school"]
database: BackupManifest["database"]
contents: BackupManifest["contents"]
integrity: BackupManifest["integrity"]
}

async function loadBackupHistory(): Promise<BackupHistoryItem[]> {
const session =
await requirePermission("backups.read")


const schoolId =
    session.user.schoolId

if (!schoolId) {
    return []
}

const backupDirectory =
    getSchoolBackupDirectory(
        String(schoolId),
    )

try {
    await fs.access(backupDirectory)
} catch {
    return []
}

const entries =
    await fs.readdir(
        backupDirectory,
        {
            withFileTypes: true,
        },
    )

const backups: BackupHistoryItem[] = []

for (const entry of entries) {
    if (
        !entry.isDirectory() ||
        entry.name.startsWith(".tmp-")
    ) {
        continue
    }

    const backupDirectoryPath =
        path.join(
            backupDirectory,
            entry.name,
        )

    const manifestPath =
        path.join(
            backupDirectoryPath,
            "manifest.json",
        )

    try {
        const manifestContent =
            await fs.readFile(
                manifestPath,
                "utf8",
            )

        const manifest =
            JSON.parse(
                manifestContent,
            ) as BackupManifest

        backups.push({
            id: entry.name,
            createdAt: manifest.createdAt,
            school: manifest.school,
            database: manifest.database,
            contents: manifest.contents,
            integrity: manifest.integrity,
        })
    } catch {
        continue
    }
}

backups.sort(
    (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
)

return backups


}

export default async function BackupSettingsPage() {
const backups =
await loadBackupHistory()


return (
    <BackupSettingsClient
        initialBackups={backups}
    />
)


}
