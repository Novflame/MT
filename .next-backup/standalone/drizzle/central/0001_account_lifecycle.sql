ALTER TABLE `user` ADD COLUMN `must_change_password` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `provisioning_status` text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `provisioning_type` text;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `provisioning_reference_id` text;
--> statement-breakpoint
ALTER TABLE `user` ADD COLUMN `provisioning_metadata` text;
--> statement-breakpoint
CREATE INDEX `user_provisioning_status_idx` ON `user` (`provisioning_status`);
--> statement-breakpoint
CREATE TABLE `account_audit_log` (
  `id` text PRIMARY KEY NOT NULL,
  `school_id` integer NOT NULL,
  `actor_user_id` text NOT NULL,
  `target_user_id` text,
  `action` text NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_audit_school_created_idx` ON `account_audit_log` (`school_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `account_audit_target_idx` ON `account_audit_log` (`target_user_id`);
