ALTER TABLE `beta_signups` ADD `display_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `beta_signups` ADD `interest_reason` text NOT NULL;--> statement-breakpoint
ALTER TABLE `beta_signups` ADD `making_background` text;--> statement-breakpoint
ALTER TABLE `beta_signups` ADD `referral_source` text;--> statement-breakpoint
ALTER TABLE `beta_signups` ADD `review_notes` text;--> statement-breakpoint
CREATE UNIQUE INDEX `beta_signups_email_unique` ON `beta_signups` (`email`);