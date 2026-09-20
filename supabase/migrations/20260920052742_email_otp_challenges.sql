CREATE TABLE "email_otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"code_digest" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer NOT NULL,
	CONSTRAINT "email_otp_challenges_digest_length_check" CHECK (char_length("email_otp_challenges"."code_digest") = 64),
	CONSTRAINT "email_otp_challenges_attempts_check" CHECK ("email_otp_challenges"."attempt_count" >= 0 and "email_otp_challenges"."attempt_count" <= "email_otp_challenges"."max_attempts" and "email_otp_challenges"."max_attempts" > 0),
	CONSTRAINT "email_otp_challenges_expiry_check" CHECK ("email_otp_challenges"."expires_at" > "email_otp_challenges"."created_at")
);
--> statement-breakpoint
ALTER TABLE "email_otp_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "email_otp_challenges_email_created_idx" ON "email_otp_challenges" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "email_otp_challenges_expires_at_idx" ON "email_otp_challenges" USING btree ("expires_at");--> statement-breakpoint
REVOKE ALL ON TABLE "email_otp_challenges" FROM "anon";--> statement-breakpoint
REVOKE ALL ON TABLE "email_otp_challenges" FROM "authenticated";
