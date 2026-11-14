CREATE TABLE `school_feature_flags` (
	`school_id` integer PRIMARY KEY NOT NULL,
	`timetable_enabled` integer DEFAULT false NOT NULL,
	`timetable_attendance_grace_minutes` integer DEFAULT 10 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `school_registration_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` integer,
	`admin_user_id` text,
	`school_slug` text NOT NULL,
	`admin_email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stage` text,
	`failure_stage` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` integer,
	`lease_token` text,
	`metadata` text,
	`last_error` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`admin_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_registration_operations_school_slug_unique` ON `school_registration_operations` (`school_slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `school_registration_admin_user_unique` ON `school_registration_operations` (`admin_user_id`) WHERE "school_registration_operations"."admin_user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `school_registration_recovery_idx` ON `school_registration_operations` (`status`,`lease_until`);--> statement-breakpoint
DROP INDEX `user_provisioning_status_idx`;--> statement-breakpoint
ALTER TABLE `user` ADD `provisioning_stage` text;--> statement-breakpoint
ALTER TABLE `user` ADD `provisioning_failure_stage` text;--> statement-breakpoint
ALTER TABLE `user` ADD `provisioning_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `provisioning_lease_until` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `provisioning_operation_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `provisioning_lease_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_provisioning_operation_id_unique` ON `user` (`provisioning_operation_id`) WHERE "user"."provisioning_operation_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `user_provisioning_recovery_idx` ON `user` (`provisioning_status`,`provisioning_lease_until`);