CREATE TABLE `school_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`enrollment_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`certificate_type` text NOT NULL,
	`issued_at` text NOT NULL,
	`issued_by_user_id` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_certificate_enrollment_year_type_unique` ON `school_certificates` (`enrollment_id`,`academic_year_id`,`certificate_type`);