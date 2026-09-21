ALTER TABLE "users" ADD COLUMN "phone_input" varchar(40);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_country" varchar(2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_needs_review" boolean DEFAULT false NOT NULL;