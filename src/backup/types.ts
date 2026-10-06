
export type BackupDatabaseProvider = "sqlite"


export type BackupManifest = {
  backupVersion: 1
  format: "school-management-backup"
  appVersion: string
  createdAt: string

  school: {
    id: string
    name: string
  }

  database: {
    provider: BackupDatabaseProvider

    migration: {
      hash: string
      createdAt: number
    } | null
  }

  contents: {
    database: true
    files: boolean
  }

  integrity: {
    algorithm: "sha256"
    databaseSha256: string
  }
}


export type BackupResult = {
  id: string
  path: string
  manifest: BackupManifest
}

