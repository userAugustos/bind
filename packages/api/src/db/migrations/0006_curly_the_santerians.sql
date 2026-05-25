CREATE TABLE `proposal_memos` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`content` text NOT NULL,
	`error` text,
	`model_provider` text NOT NULL,
	`model_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `review_cases`(`id`) ON UPDATE no action ON DELETE restrict
);
