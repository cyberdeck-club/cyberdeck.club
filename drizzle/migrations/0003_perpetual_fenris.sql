PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_builds` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`content` text,
	`hero_image_url` text,
	`status` text DEFAULT 'pending_auto' NOT NULL,
	`author_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`rejection_reason` text,
	`auto_review_result` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`published_at` text,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_builds`("id", "slug", "title", "description", "content", "hero_image_url", "status", "author_id", "created_at", "updated_at", "rejection_reason", "auto_review_result", "reviewed_by", "reviewed_at", "published_at") SELECT "id", "slug", "title", "description", "content", "hero_image_url", "status", "author_id", "created_at", "updated_at", "rejection_reason", "auto_review_result", "reviewed_by", "reviewed_at", "published_at" FROM `builds`;--> statement-breakpoint
DROP TABLE `builds`;--> statement-breakpoint
ALTER TABLE `__new_builds` RENAME TO `builds`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `builds_slug_unique` ON `builds` (`slug`);--> statement-breakpoint
ALTER TABLE `wiki_revisions` ADD `diff_summary` text;--> statement-breakpoint
ALTER TABLE `user` ADD `accepted_build_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `first_build_published_at` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_mod_nominated` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `mod_nominated_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `user` ADD `mod_nominated_at` text;--> statement-breakpoint
ALTER TABLE `user` ADD `banned_at` text;--> statement-breakpoint
ALTER TABLE `user` ADD `banned_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `user` ADD `ban_reason` text;