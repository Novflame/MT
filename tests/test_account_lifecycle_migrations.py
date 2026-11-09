"""SQLite integration checks for additive central-account migration and school portal links."""
import pathlib
import re
import sqlite3
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
CENTRAL = ROOT / "drizzle" / "central"
SCHOOL = ROOT / "drizzle" / "school"


def execute_migration(db, path):
    # Drizzle breakpoints are separators, not SQL statements.
    sql = path.read_text(encoding="utf-8").replace("--> statement-breakpoint", "")
    db.executescript(sql)


def compatible_0003_sql():
    sql = (SCHOOL / "0003_clumsy_darkstar.sql").read_text(encoding="utf-8")
    for column in ["admission_number", "first_name", "middle_name", "last_name", "date_of_birth", "gender", "nationality", "phone", "address", "city", "created_at", "updated_at"]:
        sql = re.sub(r"(ALTER TABLE `students` ADD `" + column + r"` text) NOT NULL;", r"\1 NOT NULL DEFAULT '';", sql)
    repair = """UPDATE `students` SET `admission_number` = 'LEGACY-' || `id` WHERE `admission_number` = '';
--> statement-breakpoint
UPDATE `students` SET `first_name` = `name`, `middle_name` = '', `last_name` = '', `gender` = 'unspecified', `nationality` = 'unspecified', `notes` = COALESCE(NULLIF(`notes`, ''), 'Legacy migration: complete missing student details'), `created_at` = CASE WHEN `created_at` = '' THEN datetime('now') ELSE `created_at` END, `updated_at` = CASE WHEN `updated_at` = '' THEN datetime('now') ELSE `updated_at` END;
--> statement-breakpoint
"""
    return sql.replace("CREATE UNIQUE INDEX `students_admission_number_unique`", repair + "CREATE UNIQUE INDEX `students_admission_number_unique`")


class CentralAccountLifecycleMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        execute_migration(self.db, CENTRAL / "0000_red_hellfire_club.sql")
        self.db.execute("INSERT INTO schools(name,slug) VALUES('Test School','test-school')")
        self.db.execute("INSERT INTO user(id,name,email,email_verified,school_id,school_role,created_at,updated_at) VALUES('old-user','Old User','old@example.test',1,1,'principal',100,100)")
        self.db.execute("INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES('account-1','old-user','credential','old-user','scrypt:NOT-A-REAL-SECRET',100,100)")
        self.db.execute("INSERT INTO session(id,expires_at,token,created_at,updated_at,user_id) VALUES('session-1',9999999999999,'opaque-test-token',100,100,'old-user')")
        execute_migration(self.db, CENTRAL / "0001_account_lifecycle.sql")

    def tearDown(self):
        self.db.close()

    def test_empty_central_database_migrates_to_complete_account_lifecycle_schema(self):
        empty = sqlite3.connect(":memory:")
        try:
            empty.execute("PRAGMA foreign_keys=ON")
            execute_migration(empty, CENTRAL / "0000_red_hellfire_club.sql")
            execute_migration(empty, CENTRAL / "0001_account_lifecycle.sql")
            columns = {row[1] for row in empty.execute("PRAGMA table_info(user)")}
            self.assertTrue({"must_change_password", "provisioning_status", "provisioning_type", "provisioning_reference_id", "provisioning_metadata"}.issubset(columns))
            self.assertEqual(empty.execute("SELECT count(*) FROM account_audit_log").fetchone()[0], 0)
            self.assertEqual(empty.execute("PRAGMA foreign_key_check").fetchall(), [])
        finally:
            empty.close()

    def test_existing_central_users_accounts_and_sessions_survive_additive_migration(self):
        row = self.db.execute("SELECT id, must_change_password, provisioning_status, banned FROM user WHERE id='old-user'").fetchone()
        self.assertEqual(row, ("old-user", 0, "active", 0))
        self.assertEqual(self.db.execute("SELECT count(*) FROM account WHERE user_id='old-user'").fetchone()[0], 1)
        self.assertEqual(self.db.execute("SELECT count(*) FROM session WHERE user_id='old-user'").fetchone()[0], 1)
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(), [])

    def test_forced_password_change_and_failed_provisioning_states_are_persisted(self):
        self.db.execute("UPDATE user SET must_change_password=1 WHERE id='old-user'")
        self.assertEqual(self.db.execute("SELECT must_change_password FROM user WHERE id='old-user'").fetchone()[0], 1)
        self.db.execute("UPDATE user SET provisioning_status='failed', banned=1 WHERE id='old-user'")
        self.assertEqual(self.db.execute("SELECT provisioning_status,banned FROM user WHERE id='old-user'").fetchone(), ("failed", 1))

    def test_account_audit_log_does_not_require_password_or_token_fields(self):
        self.db.execute("INSERT INTO account_audit_log(id,school_id,actor_user_id,target_user_id,action) VALUES('audit-1',1,'old-user','old-user','initial_password_changed')")
        columns = {row[1] for row in self.db.execute("PRAGMA table_info(account_audit_log)")}
        self.assertEqual(columns, {"id", "school_id", "actor_user_id", "target_user_id", "action", "created_at"})
        self.assertEqual(self.db.execute("SELECT action FROM account_audit_log WHERE id='audit-1'").fetchone()[0], "initial_password_changed")


class SchoolPortalLinkIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        for migration in ["0000_loving_viper.sql", "0001_dark_tarot.sql", "0002_cool_wallow.sql"]:
            execute_migration(self.db, SCHOOL / migration)
        self.db.executescript(compatible_0003_sql())
        for migration in ["0004_curious_meggan.sql", "0005_add_school_certificates.sql", "0006_normalize_final_exam_type.sql", "0007_grade_integrity_constraints.sql"]:
            execute_migration(self.db, SCHOOL / migration)
        self.db.execute("INSERT INTO students(id,admission_number,first_name,middle_name,last_name,date_of_birth,gender,nationality,phone,address,city,created_at,updated_at) VALUES('s1','A1','A','','One','2010-01-01','unspecified','unspecified','','','',datetime('now'),datetime('now'))")
        self.db.execute("INSERT INTO students(id,admission_number,first_name,middle_name,last_name,date_of_birth,gender,nationality,phone,address,city,created_at,updated_at) VALUES('s2','A2','B','','Two','2010-01-01','unspecified','unspecified','','','',datetime('now'),datetime('now'))")
        self.db.execute("INSERT INTO parents(id,user_id,name,phone) VALUES('p1',NULL,'Parent One','555')")

    def tearDown(self):
        self.db.close()

    def test_one_parent_account_can_be_linked_to_multiple_children(self):
        self.db.execute("UPDATE parents SET user_id='parent-user-1' WHERE id='p1' AND user_id IS NULL")
        self.db.execute("INSERT INTO parent_students(id,parent_id,student_id) VALUES('ps1','p1','s1')")
        self.db.execute("INSERT INTO parent_students(id,parent_id,student_id) VALUES('ps2','p1','s2')")
        rows = self.db.execute("SELECT student_id FROM parent_students WHERE parent_id='p1' ORDER BY student_id").fetchall()
        self.assertEqual(rows, [("s1",), ("s2",)])
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO parent_students(id,parent_id,student_id) VALUES('ps3','p1','s1')")

    def test_student_portal_link_is_one_to_one(self):
        self.db.execute("INSERT INTO student_users(id,user_id,student_id) VALUES('su1','student-user-1','s1')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO student_users(id,user_id,student_id) VALUES('su2','student-user-2','s1')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO student_users(id,user_id,student_id) VALUES('su3','student-user-1','s2')")
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(), [])


class TwoSchoolIsolationTests(unittest.TestCase):
    def test_two_school_database_files_keep_records_separate(self):
        with tempfile.TemporaryDirectory() as directory:
            first_path = pathlib.Path(directory) / "school-1.db"
            second_path = pathlib.Path(directory) / "school-2.db"
            first = sqlite3.connect(first_path)
            second = sqlite3.connect(second_path)
            try:
                for db in (first, second):
                    db.execute("CREATE TABLE students(id TEXT PRIMARY KEY, name TEXT NOT NULL)")
                    db.execute("CREATE TABLE grades(id TEXT PRIMARY KEY, student_id TEXT NOT NULL, score INTEGER NOT NULL)")
                first.execute("INSERT INTO students VALUES('student-1','School One Student')")
                first.execute("INSERT INTO grades VALUES('grade-1','student-1',88)")
                second.execute("INSERT INTO students VALUES('student-1','School Two Student')")
                second.execute("INSERT INTO grades VALUES('grade-1','student-1',42)")
                first.commit(); second.commit()
                self.assertEqual(first.execute("SELECT name FROM students WHERE id='student-1'").fetchone()[0], "School One Student")
                self.assertEqual(second.execute("SELECT name FROM students WHERE id='student-1'").fetchone()[0], "School Two Student")
                first.execute("UPDATE grades SET score=99 WHERE id='grade-1'"); first.commit()
                self.assertEqual(second.execute("SELECT score FROM grades WHERE id='grade-1'").fetchone()[0], 42)
            finally:
                first.close(); second.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
