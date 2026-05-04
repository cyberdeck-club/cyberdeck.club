CREATE TABLE `pat_usage_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`token_id` text NOT NULL,
	`user_id` text NOT NULL,
	`method` text NOT NULL,
	`path` text NOT NULL,
	`status_code` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`token_id`) REFERENCES `personal_access_tokens`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pat_usage_logs_token_id_idx` ON `pat_usage_logs` (`token_id`);--> statement-breakpoint
CREATE INDEX `pat_usage_logs_user_id_idx` ON `pat_usage_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `pat_usage_logs_created_at_idx` ON `pat_usage_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `personal_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_prefix` text NOT NULL,
	`scopes` text NOT NULL,
	`expires_at` integer,
	`last_used_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pat_token_hash_idx` ON `personal_access_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `pat_user_id_idx` ON `personal_access_tokens` (`user_id`);