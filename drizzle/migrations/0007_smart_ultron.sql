CREATE TABLE `edit_history` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`editor_id` text NOT NULL,
	`edited_at` integer NOT NULL,
	`changes_summary` text,
	`previous_content` text,
	FOREIGN KEY (`editor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
