CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('cash', 'checking', 'savings', 'credit', 'container');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('created', 'updated', 'deleted', 'classified');--> statement-breakpoint
CREATE TYPE "public"."bank_sync_status" AS ENUM('active', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."budget_period" AS ENUM('weekly', 'monthly', 'yearly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."financial_nature" AS ENUM('real_income', 'real_expense', 'refund', 'transient_fund');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('duplicate_alert', 'budget_warning', 'sync_error', 'system_update');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan_type" AS ENUM('free', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_provider" AS ENUM('stripe', 'paypal', 'apple', 'manual');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."transaction_origin" AS ENUM('manual', 'api_sync', 'csv_import');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending_review', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'admin', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."workspace_type" AS ENUM('personal', 'business');--> statement-breakpoint
CREATE TABLE "account_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"statement_date" date NOT NULL,
	"reported_balance_cents" bigint NOT NULL,
	"system_balance_cents" bigint NOT NULL,
	"is_reconciled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"bank_connection_id" uuid,
	"parent_account_id" uuid,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"currency" varchar(3),
	"is_system_default" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "accounts_currency_matches_type_check" CHECK ((("accounts"."type" = 'container' and "accounts"."currency" is null) or ("accounts"."type" <> 'container' and "accounts"."currency" is not null)))
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_area_id" uuid,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "areas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"entity_name" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"changed_by_user_id" uuid,
	"action" "audit_action" NOT NULL,
	"old_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"new_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bank_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"institution_name" text NOT NULL,
	"api_token" text NOT NULL,
	"sync_status" "bank_sync_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budget_categories" (
	"budget_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "budget_categories_budget_id_category_id_pk" PRIMARY KEY("budget_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "budget_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_budget_id" uuid,
	"name" text NOT NULL,
	"amount_limit_cents" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"period" "budget_period" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"alert_threshold" numeric(5, 2) DEFAULT '80.00' NOT NULL,
	"area_id" uuid
);
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"parent_category_id" uuid,
	"name_key" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"amount_paid_cents" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"invoice_pdf_url" text NOT NULL,
	"paid_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"type" "notification_type" NOT NULL,
	"message_key" text NOT NULL,
	"context_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"plan_type" "subscription_plan_type" DEFAULT 'free' NOT NULL,
	"provider" "subscription_provider" DEFAULT 'manual' NOT NULL,
	"provider_subscription_id" text,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"type" "transaction_type" NOT NULL,
	"financial_nature" "financial_nature" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"origin" "transaction_origin" DEFAULT 'manual' NOT NULL,
	"status" "transaction_status" DEFAULT 'pending_review' NOT NULL,
	"duplicate_flag" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"attachment_url" text,
	"tax_amount_cents" bigint DEFAULT 0 NOT NULL,
	"area_id" uuid
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"locale" text DEFAULT 'es-CO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"notification_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_users" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	CONSTRAINT "workspace_users_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "workspace_type" NOT NULL,
	"base_currency" varchar(3) NOT NULL,
	"license_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bank_connection_id_bank_connections_id_fk" FOREIGN KEY ("bank_connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_account_id_accounts_id_fk" FOREIGN KEY ("parent_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_parent_area_id_areas_id_fk" FOREIGN KEY ("parent_area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_parent_budget_id_budgets_id_fk" FOREIGN KEY ("parent_budget_id") REFERENCES "public"."budgets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_snapshots_account_id_idx" ON "account_snapshots" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_snapshots_account_statement_date_idx" ON "account_snapshots" USING btree ("account_id","statement_date");--> statement-breakpoint
CREATE INDEX "accounts_workspace_id_idx" ON "accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "accounts_bank_connection_id_idx" ON "accounts" USING btree ("bank_connection_id");--> statement-breakpoint
CREATE INDEX "accounts_parent_account_id_idx" ON "accounts" USING btree ("parent_account_id");--> statement-breakpoint
CREATE INDEX "areas_workspace_id_idx" ON "areas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "areas_parent_area_id_idx" ON "areas" USING btree ("parent_area_id");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_id_idx" ON "audit_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_logs_changed_by_user_id_idx" ON "audit_logs" USING btree ("changed_by_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_name","entity_id");--> statement-breakpoint
CREATE INDEX "bank_connections_workspace_id_idx" ON "bank_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "budget_categories_category_id_idx" ON "budget_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "budgets_workspace_id_idx" ON "budgets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "budgets_parent_budget_id_idx" ON "budgets" USING btree ("parent_budget_id");--> statement-breakpoint
CREATE INDEX "budgets_area_id_idx" ON "budgets" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "categories_workspace_id_idx" ON "categories" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "categories_parent_category_id_idx" ON "categories" USING btree ("parent_category_id");--> statement-breakpoint
CREATE INDEX "invoices_workspace_id_idx" ON "invoices" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "notifications_workspace_id_idx" ON "notifications" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_workspace_id_idx" ON "subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_account_date_idx" ON "transactions" USING btree ("account_id","transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transactions_area_id_idx" ON "transactions" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "workspace_users_user_id_idx" ON "workspace_users" USING btree ("user_id");
