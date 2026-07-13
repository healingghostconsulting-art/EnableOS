CREATE TABLE `notification_outbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idempotency_key` varchar(255) NOT NULL,
	`reminder_type` varchar(48) NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`status` enum('stubbed','sent','failed','skipped') NOT NULL,
	`rendered_subject` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_outbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_outbox_idem` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`reminder_type` varchar(48) NOT NULL DEFAULT '',
	`channel` varchar(16) NOT NULL DEFAULT '',
	`enabled` boolean NOT NULL DEFAULT true,
	`unsubscribed_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_natural` UNIQUE(`user_id`,`tenant_id`,`reminder_type`,`channel`)
);
--> statement-breakpoint
CREATE INDEX `notification_preferences_lookup` ON `notification_preferences` (`user_id`,`tenant_id`);