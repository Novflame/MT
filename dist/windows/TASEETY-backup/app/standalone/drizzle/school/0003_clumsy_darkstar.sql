CREATE TABLE `result_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`issued_at` text NOT NULL,
	`issued_by_user_id` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `result_certificate_enrollment_unique` ON `result_certificates` (`enrollment_id`);--> statement-breakpoint
ALTER TABLE `students` ADD `admission_number` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `first_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `middle_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `last_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `date_of_birth` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `gender` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `nationality` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `national_id` text;--> statement-breakpoint
ALTER TABLE `students` ADD `photo` text;--> statement-breakpoint
ALTER TABLE `students` ADD `phone` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `email` text;--> statement-breakpoint
ALTER TABLE `students` ADD `address` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `city` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `students` ADD `created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `updated_at` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `students_admission_number_unique` ON `students` (`admission_number`);--> statement-breakpoint
ALTER TABLE `students` DROP COLUMN `name`;