const Database = require("better-sqlite3");
const { runSchoolMigrations } = require("./src/db/runtime-migrations");

for (const file of [
  "./databases/school_1.db",
  "./databases/school_2.db"
]) {
  console.log("\nApplying school migrations:", file);

  const sqlite = new Database(file);

  try {
    runSchoolMigrations(sqlite);
    console.log("SUCCESS:", file);
  } catch (error) {
    console.error("FAILED:", file, error.message);
    process.exitCode = 1;
    break;
  } finally {
    sqlite.close();
  }
}
