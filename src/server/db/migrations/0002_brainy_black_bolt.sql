ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" text NOT NULL;