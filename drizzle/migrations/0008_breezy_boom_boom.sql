ALTER TABLE `builds` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `forum_posts` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `forum_threads` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `wiki_articles` ADD `deleted_at` integer;