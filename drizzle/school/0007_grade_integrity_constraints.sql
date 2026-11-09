CREATE TABLE `__new_grades` (
    `id` text PRIMARY KEY NOT NULL,
    `student_enrollment_id` text NOT NULL,
    `test_id` text,
    `exam_id` text,
    `score` integer NOT NULL,
    `note` text,
    `updated_at` text NOT NULL,
    CHECK (`score` >= 0),
    CHECK ((`test_id` IS NOT NULL AND `exam_id` IS NULL) OR (`test_id` IS NULL AND `exam_id` IS NOT NULL)),
    FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (`test_id`) REFERENCES `tests`(`id`) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_grades` (`id`, `student_enrollment_id`, `test_id`, `exam_id`, `score`, `note`, `updated_at`)
SELECT `id`, `student_enrollment_id`, `test_id`, `exam_id`, `score`, `note`, `updated_at` FROM `grades`;
--> statement-breakpoint
DROP TABLE `grades`;
--> statement-breakpoint
ALTER TABLE `__new_grades` RENAME TO `grades`;
--> statement-breakpoint
CREATE UNIQUE INDEX `grade_enrollment_test_unique` ON `grades` (`student_enrollment_id`, `test_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `grade_enrollment_exam_unique` ON `grades` (`student_enrollment_id`, `exam_id`);
--> statement-breakpoint
CREATE TRIGGER `grades_test_score_integrity_insert`
BEFORE INSERT ON `grades`
WHEN NEW.`test_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `tests` t
    JOIN `student_enrollments` e ON e.`id` = NEW.`student_enrollment_id`
    WHERE t.`id` = NEW.`test_id`
      AND NEW.`score` <= t.`max_score`
      AND t.`class_id` = e.`class_id`
      AND t.`academic_year_id` = e.`academic_year_id`
)
BEGIN SELECT RAISE(ABORT, 'Grade must match a valid test and not exceed its maximum score'); END;
--> statement-breakpoint
CREATE TRIGGER `grades_exam_score_integrity_insert`
BEFORE INSERT ON `grades`
WHEN NEW.`exam_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `exams` x
    JOIN `student_enrollments` e ON e.`id` = NEW.`student_enrollment_id`
    WHERE x.`id` = NEW.`exam_id`
      AND NEW.`score` <= x.`max_score`
      AND x.`class_id` = e.`class_id`
      AND x.`academic_year_id` = e.`academic_year_id`
)
BEGIN SELECT RAISE(ABORT, 'Grade must match a valid exam and not exceed its maximum score'); END;
--> statement-breakpoint
CREATE TRIGGER `grades_test_score_integrity_update`
BEFORE UPDATE OF `student_enrollment_id`, `test_id`, `exam_id`, `score` ON `grades`
WHEN NEW.`test_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `tests` t
    JOIN `student_enrollments` e ON e.`id` = NEW.`student_enrollment_id`
    WHERE t.`id` = NEW.`test_id`
      AND NEW.`score` <= t.`max_score`
      AND t.`class_id` = e.`class_id`
      AND t.`academic_year_id` = e.`academic_year_id`
)
BEGIN SELECT RAISE(ABORT, 'Grade must match a valid test and not exceed its maximum score'); END;
--> statement-breakpoint
CREATE TRIGGER `grades_exam_score_integrity_update`
BEFORE UPDATE OF `student_enrollment_id`, `test_id`, `exam_id`, `score` ON `grades`
WHEN NEW.`exam_id` IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM `exams` x
    JOIN `student_enrollments` e ON e.`id` = NEW.`student_enrollment_id`
    WHERE x.`id` = NEW.`exam_id`
      AND NEW.`score` <= x.`max_score`
      AND x.`class_id` = e.`class_id`
      AND x.`academic_year_id` = e.`academic_year_id`
)
BEGIN SELECT RAISE(ABORT, 'Grade must match a valid exam and not exceed its maximum score'); END;
--> statement-breakpoint
CREATE TRIGGER `tests_max_score_update_guard`
BEFORE UPDATE OF `max_score` ON `tests`
WHEN EXISTS (SELECT 1 FROM `grades` WHERE `test_id` = OLD.`id` AND `score` > NEW.`max_score`)
BEGIN SELECT RAISE(ABORT, 'Test maximum score cannot be lower than an existing grade'); END;
--> statement-breakpoint
CREATE TRIGGER `exams_max_score_update_guard`
BEFORE UPDATE OF `max_score` ON `exams`
WHEN EXISTS (SELECT 1 FROM `grades` WHERE `exam_id` = OLD.`id` AND `score` > NEW.`max_score`)
BEGIN SELECT RAISE(ABORT, 'Exam maximum score cannot be lower than an existing grade'); END;
