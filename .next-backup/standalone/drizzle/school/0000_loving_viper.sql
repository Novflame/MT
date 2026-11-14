CREATE TABLE `academic_years` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`student_enrollment_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_enrollment_subject_date_unique` ON `attendance` (`student_enrollment_id`,`subject_id`,`date`);--> statement-breakpoint
CREATE TABLE `class_heads` (
	`academic_year_id` text NOT NULL,
	`user_id` text NOT NULL,
	`class_id` text NOT NULL,
	PRIMARY KEY(`academic_year_id`, `user_id`, `class_id`),
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_head_one_per_class_per_year` ON `class_heads` (`academic_year_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `department_heads` (
	`academic_year_id` text NOT NULL,
	`user_id` text NOT NULL,
	`department_id` text NOT NULL,
	PRIMARY KEY(`academic_year_id`, `user_id`, `department_id`),
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subject_id` text NOT NULL,
	`class_id` text NOT NULL,
	`type` text NOT NULL,
	`exam_date` text NOT NULL,
	`max_score` integer NOT NULL,
	`academic_year_id` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` text PRIMARY KEY NOT NULL,
	`student_enrollment_id` text NOT NULL,
	`test_id` text,
	`exam_id` text,
	`score` integer NOT NULL,
	`note` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_id`) REFERENCES `tests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grade_enrollment_test_unique` ON `grades` (`student_enrollment_id`,`test_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `grade_enrollment_exam_unique` ON `grades` (`student_enrollment_id`,`exam_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'general' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `parent_students` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_user_id` text NOT NULL,
	`student_id` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parent_student_unique` ON `parent_students` (`parent_user_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `school_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade_level` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`phone` text,
	`profile_image` text,
	`date_of_birth` text,
	`address` text,
	`qualification` text,
	`employment_date` text,
	`specialization` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_profiles_user_id_unique` ON `staff_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `student_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`class_id` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_academic_year_unique` ON `student_enrollments` (`student_id`,`academic_year_id`);--> statement-breakpoint
CREATE TABLE `student_users` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`student_id` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_users_user_id_unique` ON `student_users` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `student_users_student_id_unique` ON `student_users` (`student_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_phone` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`department_id` text,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teacher_assignments` (
	`academic_year_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`class_id` text NOT NULL,
	PRIMARY KEY(`academic_year_id`, `teacher_id`, `subject_id`, `class_id`),
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tests` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subject_id` text NOT NULL,
	`class_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`test_date` text NOT NULL,
	`max_score` integer NOT NULL,
	`term` text DEFAULT 'term1' NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action
);
