CREATE TABLE `class_session_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`details` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `class_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `class_session_notification_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `class_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_session_notification_event_unique` ON `class_session_notification_events` (`session_id`,`event_type`);--> statement-breakpoint
CREATE TABLE `class_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`timetable_slot_id` text,
	`academic_year_id` text NOT NULL,
	`class_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`scheduled_teacher_id` text NOT NULL,
	`actual_teacher_id` text NOT NULL,
	`session_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`cancellation_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`timetable_slot_id`) REFERENCES `class_timetable_slots`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `class_sessions_date_class_idx` ON `class_sessions` (`session_date`,`class_id`);--> statement-breakpoint
CREATE INDEX `class_sessions_teacher_date_idx` ON `class_sessions` (`actual_teacher_id`,`session_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `class_session_slot_date_unique` ON `class_sessions` (`timetable_slot_id`,`session_date`);--> statement-breakpoint
CREATE TABLE `class_timetable_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`timetable_id` text NOT NULL,
	`slot_id` text,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`details` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`timetable_id`) REFERENCES `class_timetables`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slot_id`) REFERENCES `class_timetable_slots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `class_timetable_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`timetable_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`class_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`period_number` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`timetable_id`) REFERENCES `class_timetables`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_timetable_period_unique` ON `class_timetable_slots` (`timetable_id`,`day_of_week`,`period_number`);--> statement-breakpoint
CREATE TABLE `class_timetables` (
	`id` text PRIMARY KEY NOT NULL,
	`academic_year_id` text NOT NULL,
	`class_id` text NOT NULL,
	`name` text DEFAULT 'Main timetable' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_timetable_year_class_unique` ON `class_timetables` (`academic_year_id`,`class_id`);--> statement-breakpoint
CREATE TABLE `session_student_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_enrollment_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`recorded_by` text NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `class_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_student_attendance_unique` ON `session_student_attendance` (`session_id`,`student_enrollment_id`);--> statement-breakpoint
CREATE TABLE `session_teacher_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`checked_in_at` text,
	`checked_out_at` text,
	`status` text DEFAULT 'present' NOT NULL,
	`late_minutes` integer DEFAULT 0 NOT NULL,
	`note` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `class_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_teacher_attendance_session_id_unique` ON `session_teacher_attendance` (`session_id`);