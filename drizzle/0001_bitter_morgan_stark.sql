CREATE TABLE `documentationEntries` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`subjectUserId` varchar(64) NOT NULL,
	`sourceType` enum('journey_completion','module_completion','intervention_completion','coaching_summary') NOT NULL,
	`title` varchar(180) NOT NULL,
	`summary` text NOT NULL,
	`authoredByRole` enum('system','executive','manager','learner','client_admin') NOT NULL,
	`evidenceJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentationEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewLogs` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`subjectUserId` varchar(64) NOT NULL,
	`authorUserId` varchar(64) NOT NULL,
	`authorRole` enum('executive','manager','client_admin') NOT NULL,
	`reviewType` enum('one_on_one','quarterly_check_in','annual_review') NOT NULL,
	`title` varchar(180) NOT NULL,
	`notes` text NOT NULL,
	`nextStep` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenantAccessGrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`userOpenId` varchar(64) NOT NULL,
	`workspaceRole` enum('executive','manager','learner','client_admin','platform_admin') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenantAccessGrants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`industry` varchar(120) NOT NULL,
	`preferredLabel` varchar(160) NOT NULL,
	`accent` varchar(7) NOT NULL,
	`logoMark` varchar(8) NOT NULL,
	`heroStatement` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
