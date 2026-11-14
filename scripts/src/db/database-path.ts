import path from "node:path"

/** Resolve a school's SQLite file from the single configured database directory. */
export function getSchoolDatabasePath(schoolId: string | number): string {
    const normalized = String(schoolId).trim()
    if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
        throw new Error("Invalid school id")
    }

    const databaseDirectory = process.env.SCHOOL_DATABASE_DIR?.trim()
        ? path.resolve(process.env.SCHOOL_DATABASE_DIR)
        : path.join(process.cwd(), "databases")

    return path.join(databaseDirectory, `school_${normalized}.db`)
}
