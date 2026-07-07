CREATE TABLE `content_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scope` enum('core','tenant') NOT NULL,
	`tenant_id` varchar(64) NOT NULL DEFAULT '',
	`content_type` varchar(48) NOT NULL,
	`collection_key` varchar(191) NOT NULL,
	`item_id` varchar(191) NOT NULL DEFAULT '',
	`op` enum('patch','hide','add','meta') NOT NULL,
	`payload` text,
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_overrides_natural` UNIQUE(`scope`,`tenant_id`,`content_type`,`collection_key`,`item_id`,`op`)
);
--> statement-breakpoint
CREATE INDEX `content_overrides_lookup` ON `content_overrides` (`scope`,`tenant_id`,`content_type`,`collection_key`);