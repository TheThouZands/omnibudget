CREATE TABLE "email_verification_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"otp_challenge_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_digest" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "email_verification_sessions_otp_challenge_id_unique" UNIQUE("otp_challenge_id"),
	CONSTRAINT "email_verification_sessions_token_digest_unique" UNIQUE("token_digest"),
	CONSTRAINT "email_verification_sessions_digest_length_check" CHECK (char_length("email_verification_sessions"."token_digest") = 64),
	CONSTRAINT "email_verification_sessions_expiry_check" CHECK ("email_verification_sessions"."expires_at" > "email_verification_sessions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "email_verification_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_verification_sessions" ADD CONSTRAINT "email_verification_sessions_otp_challenge_id_email_otp_challenges_id_fk" FOREIGN KEY ("otp_challenge_id") REFERENCES "public"."email_otp_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verification_sessions_email_idx" ON "email_verification_sessions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_verification_sessions_expires_at_idx" ON "email_verification_sessions" USING btree ("expires_at");--> statement-breakpoint
REVOKE ALL ON TABLE "email_verification_sessions" FROM "anon";--> statement-breakpoint
REVOKE ALL ON TABLE "email_verification_sessions" FROM "authenticated";
