CREATE TABLE `core_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`academic_year_id` text NOT NULL,
	`class_id` text NOT NULL,
	`subject_id` text NOT NULL,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_subject_year_class_subject_unique` ON `core_subjects` (`academic_year_id`,`class_id`,`subject_id`);--> statement-breakpoint
CREATE TABLE `promotion_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`from_class_id` text NOT NULL,
	`to_class_id` text,
	`system_result` text NOT NULL,
	`system_decision` text NOT NULL,
	`final_decision` text NOT NULL,
	`decided_by_user_id` text,
	`reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotion_student_year_unique` ON `promotion_decisions` (`student_id`,`academic_year_id`);