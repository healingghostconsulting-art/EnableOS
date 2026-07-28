CREATE TABLE `coaching_sessions` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`coach_user_id` varchar(64) NOT NULL,
	`manager_user_id` varchar(64) NOT NULL,
	`learner_user_id` varchar(64) NOT NULL,
	`type` enum('coaching','follow_up') NOT NULL DEFAULT 'coaching',
	`title` varchar(200) NOT NULL,
	`start` varchar(40) NOT NULL,
	`duration_mins` int NOT NULL DEFAULT 30,
	`session_status` enum('scheduled','follow_up_due','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`sequence` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coaching_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `coaching_sessions_tenant` ON `coaching_sessions` (`tenant_id`);