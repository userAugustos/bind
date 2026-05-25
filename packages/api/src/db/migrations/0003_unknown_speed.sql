CREATE TABLE `document_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`document_type` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`result` text NOT NULL,
	`error` text,
	`prompt_name` text NOT NULL,
	`prompt_version` text NOT NULL,
	`schema_version` text NOT NULL,
	`model_provider` text NOT NULL,
	`model_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
