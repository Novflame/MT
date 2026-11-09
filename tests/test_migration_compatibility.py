"""SQLite regression tests for the legacy student migration and final exam normalization."""
import pathlib
import re
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "drizzle" / "school"


def compatible_0003_sql():
    sql = (MIGRATIONS / "0003_clumsy_darkstar.sql").read_text(encoding="utf-8")
    required_columns = [
        "admission_number", "first_name", "middle_name", "last_name",
        "date_of_birth", "gender", "nationality", "phone", "address",
        "city", "created_at", "updated_at",
    ]
    for column in required_columns:
        sql = re.sub(
            r"(ALTER TABLE `students` ADD `" + column + r"` text) NOT NULL;",
            r"\1 NOT NULL DEFAULT '';",
            sql,
        )
    repair = """UPDATE `students` SET `admission_number` = 'LEGACY-' || `id` WHERE `admission_number` = '';
UPDATE `students` SET `first_name` = `name`, `middle_name` = '', `last_name` = '', `gender` = 'unspecified', `nationality` = 'unspecified', `notes` = COALESCE(NULLIF(`notes`, ''), 'Legacy migration: complete missing student details'), `created_at` = CASE WHEN `created_at` = '' THEN datetime('now') ELSE `created_at` END, `updated_at` = CASE WHEN `updated_at` = '' THEN datetime('now') ELSE `updated_at` END;
--> statement-breakpoint
"""
    return sql.replace(
        "CREATE UNIQUE INDEX `students_admission_number_unique`",
        repair + "CREATE UNIQUE INDEX `students_admission_number_unique`",
    )


class MigrationCompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        for migration in [
            "0000_loving_viper.sql",
            "0001_dark_tarot.sql",
            "0002_cool_wallow.sql",
        ]:
            self.db.executescript((MIGRATIONS / migration).read_text(encoding="utf-8"))

    def tearDown(self):
        self.db.close()

    def test_populated_legacy_student_rows_are_preserved(self):
        self.db.execute("INSERT INTO students(id, name) VALUES (?, ?)", ("legacy-1", "Mariam Ahmed Ali"))
        self.db.execute("INSERT INTO students(id, name) VALUES (?, ?)", ("legacy-2", "Omar Hassan"))
        self.db.executescript(compatible_0003_sql())

        rows = self.db.execute(
            "SELECT id, admission_number, first_name, middle_name, last_name, notes FROM students ORDER BY id"
        ).fetchall()
        self.assertEqual(rows[0][0:5], ("legacy-1", "LEGACY-legacy-1", "Mariam Ahmed Ali", "", ""))
        self.assertEqual(rows[1][0:5], ("legacy-2", "LEGACY-legacy-2", "Omar Hassan", "", ""))
        self.assertIn("complete missing student details", rows[0][5])
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(), [])

    def test_final_exam_type_normalization_is_case_insensitive(self):
        self.db.executescript(compatible_0003_sql())
        self.db.executescript((MIGRATIONS / "0004_curious_meggan.sql").read_text(encoding="utf-8"))
        self.db.executescript((MIGRATIONS / "0005_add_school_certificates.sql").read_text(encoding="utf-8"))
        self.db.executescript((MIGRATIONS / "0006_normalize_final_exam_type.sql").read_text(encoding="utf-8"))
        self.db.execute("INSERT INTO academic_years(id, name, start_date, end_date, is_active) VALUES ('year-1','2026/27','2026-01-01','2027-01-01',1)")
        self.db.execute("INSERT INTO school_classes(id, name, grade_level) VALUES ('class-1','Class 1',1)")
        self.db.execute("INSERT INTO departments(id, name) VALUES ('dept-1','Department')")
        self.db.execute("INSERT INTO subjects(id, name, department_id) VALUES ('subject-1','Math','dept-1')")
        for index, value in enumerate(("final", "Final", "FINAL"), start=1):
            self.db.execute(
                "INSERT INTO exams(id,name,subject_id,class_id,type,exam_date,max_score,academic_year_id) VALUES (?,?,?,?,?,?,?,?)",
                (f"exam-{index}", "Final", "subject-1", "class-1", value, "2026-10-01", 100, "year-1"),
            )
        self.db.executescript((MIGRATIONS / "0006_normalize_final_exam_type.sql").read_text(encoding="utf-8"))
        values = [row[0] for row in self.db.execute("SELECT type FROM exams ORDER BY id").fetchall()]
        self.assertEqual(values, ["FINAL", "FINAL", "FINAL"])
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(), [])


    def test_grade_integrity_constraints_reject_invalid_data(self):
        self.db.executescript(compatible_0003_sql())
        for migration in ["0004_curious_meggan.sql", "0005_add_school_certificates.sql", "0006_normalize_final_exam_type.sql"]:
            self.db.executescript((MIGRATIONS / migration).read_text(encoding="utf-8"))
        self.db.execute("INSERT INTO academic_years(id, name, start_date, end_date, is_active) VALUES ('year-1','2026/27','2026-01-01','2027-01-01',1)")
        self.db.execute("INSERT INTO school_classes(id, name, grade_level) VALUES ('class-1','Class 1',1)")
        self.db.execute("INSERT INTO departments(id, name) VALUES ('dept-1','Department')")
        self.db.execute("INSERT INTO subjects(id, name, department_id) VALUES ('subject-1','Math','dept-1')")
        self.db.execute("INSERT INTO students(id, admission_number, first_name, middle_name, last_name, date_of_birth, gender, nationality, phone, address, city, created_at, updated_at) VALUES ('student-1','A-1','Test','','Student','2000-01-01','unspecified','unspecified','','','',datetime('now'),datetime('now'))")
        self.db.execute("INSERT INTO student_enrollments(id, student_id, academic_year_id, class_id) VALUES ('enrollment-1','student-1','year-1','class-1')")
        self.db.execute("INSERT INTO tests(id,name,subject_id,class_id,academic_year_id,test_date,max_score,term) VALUES ('test-1','Test','subject-1','class-1','year-1','2026-10-01',100,'term1')")
        self.db.executescript((MIGRATIONS / "0007_grade_integrity_constraints.sql").read_text(encoding="utf-8"))
        self.db.execute("INSERT INTO grades(id,student_enrollment_id,test_id,exam_id,score,note,updated_at) VALUES ('grade-ok','enrollment-1','test-1',NULL,80,NULL,datetime('now'))")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO grades(id,student_enrollment_id,test_id,exam_id,score,note,updated_at) VALUES ('grade-too-high','enrollment-1','test-1',NULL,101,NULL,datetime('now'))")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO grades(id,student_enrollment_id,test_id,exam_id,score,note,updated_at) VALUES ('grade-no-assessment','enrollment-1',NULL,NULL,10,NULL,datetime('now'))")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE tests SET max_score=70 WHERE id='test-1'")
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
