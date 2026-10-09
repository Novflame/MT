import Database from "better-sqlite3";
import { runSchoolMigrations } from "./src/db/runtime-migrations";

const files = [
  "./databases/school_1.db",
  "./databases/school_2.db",
];

for (const file of files) {
  console.log(`\nApplying migrations: ${file}`);
  const sqlite = new Database(file);

  try {
    runSchoolMigrations(sqlite);
    console.log(`SUCCESS: ${file}`);
  } catch (error) {
    console.error(`FAILED: ${file}`, error);
    process.exitCode = 1;
    break;
  } finally {
    sqlite.close();
  }
}
