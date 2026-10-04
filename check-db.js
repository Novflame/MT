import Database from "better-sqlite3"

const db = new Database(
    "./databases/school_1.db",
)

const tables = db
    .prepare(
        "SELECT name, sql FROM sqlite_master WHERE type = 'table'",
    )
    .all()

for (const table of tables) {
    if (
        table.sql &&
        table.sql
            .toUpperCase()
            .includes("REFERENCES STUDENTS")
    ) {
        console.log(
            "\nTABLE:",
            table.name,
        )

        console.log(table.sql)
    }
}

db.close()