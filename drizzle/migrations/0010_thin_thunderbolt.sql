CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_by` text,
	`reviewed_at` integer,
	`moderator_notes` text,
	`action_taken` text,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE INDEX `reports_reporter_id_idx` ON `reports` (`reporter_id`);--> statement-breakpoint
CREATE INDEX `reports_entity_idx` ON `reports` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `reports_created_at_idx` ON `reports` (`created_at`);