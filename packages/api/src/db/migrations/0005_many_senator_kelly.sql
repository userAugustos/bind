CREATE TABLE `quote_comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`requirements_document_id` text NOT NULL,
	`target_document_ids` text NOT NULL,
	`result` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `review_cases`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`requirements_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
