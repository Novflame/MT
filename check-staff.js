const Database = require("better-sqlite3")

const db = new Database("central.db")

const staff = db
    .prepare(`
        SELECT
            id,
            name,
            email,
            school_id,
            school_role
        FROM user
        ORDER BY school_id, school_role, name
    `)
    .all()

console.table(staff)

db.close()