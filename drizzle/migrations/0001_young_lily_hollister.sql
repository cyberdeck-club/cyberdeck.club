CREATE TABLE `static_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`meta_description` text,
	`meta_image` text,
	`featured_image` text,
	`featured_image_alt` text,
	`status` text DEFAULT 'published' NOT NULL,
	`author_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `static_pages_slug_unique` ON `static_pages` (`slug`);--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `user` ADD `bio` text;--> statement-breakpoint

-- Seed default static pages
INSERT INTO `static_pages` (`id`, `slug`, `title`, `content`, `status`, `created_at`, `updated_at`) VALUES
  (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || '4' || substr(hex(randomblob(2)),2) || '-' || substr('AB89',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'homepage',
    'Homepage',
    '{"heroTitle":"Build the future.\nFor you.\nBy you.","heroSubtitle":"💅 the girls, gays, and theys are coming together: designing and creating cyberdecks that represent who they are, regardless of skill level — from first-timers to seasoned modders.","getStartedBtn":"Get Started","joinForumBtn":"Join the Forum","whatIsTitle":"What is a Cyberdeck?","whatIsIntro":"A cyberdeck is a portable, custom-built computing rig that combines vintage aesthetics with modern technology. Think of it as a laptop you designed yourself — inside and out.","featuredWikiTitle":"Featured Wiki Articles","activeThreadsTitle":"Active Forum Threads","upcomingMeetupsTitle":"Upcoming Meetups","recentBuildsTitle":"Recent Builds","ctaTitle":"Ready to Start Building?","ctaText":"Join our community of makers, hackers, and cyberdeck enthusiasts.","introduceBtn":"Introduce Yourself","readWikiBtn":"Read the Wiki"}',
    'published',
    unixepoch(),
    unixepoch()
  ),
  (
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || '4' || substr(hex(randomblob(2)),2) || '-' || substr('AB89',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))),
    'about',
    'About',
    '<section class="mb-12"><h2>What is cyberdeck.club?</h2><p>cyberdeck.club is a community for enthusiasts building cyberdecks — portable, custom-built computers inspired by the retro-futuristic aesthetic of cyberpunk fiction.</p></section>',
    'published',
    unixepoch(),
    unixepoch()
  );