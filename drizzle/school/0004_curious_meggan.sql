ALTER TABLE `staff_profiles` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `nationality` text;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `national_id` text;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `city` text;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `employee_id` text;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `position` text;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD `department_id` text REFERENCES departments(id);--> statement-breakpoint
CREATE UNIQUE INDEX `staff_profiles_employee_id_unique` ON `staff_profiles` (`employee_id`);