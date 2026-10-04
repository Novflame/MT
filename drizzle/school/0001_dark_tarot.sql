
CREATE TABLE `parents` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text,
    `name` text NOT NULL,
    `phone` text NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX `parents_user_id_unique`
ON `parents` (`user_id`);
--> statement-breakpoint

PRAGMA foreign_keys=OFF;
--> statement-breakpoint

CREATE TABLE `__new_parent_students` (
    `id` text PRIMARY KEY NOT NULL,
    `parent_id` text NOT NULL,
    `student_id` text NOT NULL,
    FOREIGN KEY (`parent_id`)
        REFERENCES `parents`(`id`)
        ON UPDATE no action
        ON DELETE no action,
    FOREIGN KEY (`student_id`)
        REFERENCES `students`(`id`)
        ON UPDATE no action
        ON DELETE no action
);
--> statement-breakpoint

DROP TABLE `parent_students`;
--> statement-breakpoint

ALTER TABLE `__new_parent_students`
RENAME TO `parent_students`;
--> statement-breakpoint

PRAGMA foreign_keys=ON;
--> statement-breakpoint

CREATE UNIQUE INDEX `parent_student_unique`
ON `parent_students` (`parent_id`, `student_id`);
--> statement-breakpoint

ALTER TABLE `students`
DROP COLUMN `parent_phone`;

