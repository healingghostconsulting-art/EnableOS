CREATE TABLE `learner_goals` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`learner_user_id` varchar(64) NOT NULL,
	`title` varchar(200) NOT NULL,
	`detail` text,
	`goal_status` enum('active','achieved','archived') NOT NULL DEFAULT 'active',
	`target_date` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learner_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_custom_role_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`custom_role_id` varchar(64) NOT NULL,
	`workspace_path` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_custom_role_grants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_custom_role_grants_natural` UNIQUE(`custom_role_id`,`workspace_path`)
);
--> statement-breakpoint
CREATE TABLE `tenant_custom_roles` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`base_role` enum('executive','manager','coach','learner','client_admin') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_custom_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_user_invites` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(200) NOT NULL,
	`invite_workspace_role` enum('executive','manager','coach','learner','client_admin') NOT NULL,
	`invite_status` enum('invited','accepted','revoked') NOT NULL DEFAULT 'invited',
	`invited_by_open_id` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_user_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_user_invites_natural` UNIQUE(`tenant_id`,`email`)
);
--> statement-breakpoint
ALTER TABLE `tenantAccessGrants` ADD `deactivated_at` timestamp;--> statement-breakpoint
CREATE INDEX `learner_goals_tenant` ON `learner_goals` (`tenant_id`,`learner_user_id`);--> statement-breakpoint
CREATE INDEX `tenant_custom_roles_tenant` ON `tenant_custom_roles` (`tenant_id`);