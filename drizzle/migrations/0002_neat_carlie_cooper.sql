CREATE TABLE `build_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`build_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`parent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `build_comments_build_id_idx` ON `build_comments` (`build_id`);--> statement-breakpoint
CREATE INDEX `build_comments_parent_id_idx` ON `build_comments` (`parent_id`);--> statement-breakpoint
CREATE TABLE `community_guidelines_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`version` text NOT NULL,
	`accepted_at` integer NOT NULL,
	`ip_address` text,
	`turnstile_token` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `community_guidelines_acceptances_user_id_idx` ON `community_guidelines_acceptances` (`user_id`);--> statement-breakpoint
CREATE TABLE `wiki_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`parent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`article_id`) REFERENCES `wiki_articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `wiki_comments_article_id_idx` ON `wiki_comments` (`article_id`);--> statement-breakpoint
CREATE INDEX `wiki_comments_parent_id_idx` ON `wiki_comments` (`parent_id`);