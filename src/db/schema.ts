import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const defaultJsonb = sql`'{}'::jsonb`;

export const workspaceTypeEnum = pgEnum("workspace_type", [
  "personal",
  "business",
]);

export const workspaceRoleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

export const bankSyncStatusEnum = pgEnum("bank_sync_status", [
  "active",
  "error",
  "disconnected",
]);

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "checking",
  "savings",
  "credit",
  "container",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);

export const financialNatureEnum = pgEnum("financial_nature", [
  "real_income",
  "real_expense",
  "refund",
  "transient_fund",
]);

export const transactionOriginEnum = pgEnum("transaction_origin", [
  "manual",
  "api_sync",
  "csv_import",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending_review",
  "confirmed",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "created",
  "updated",
  "deleted",
  "classified",
]);

export const budgetPeriodEnum = pgEnum("budget_period", [
  "weekly",
  "monthly",
  "yearly",
  "custom",
]);

export const subscriptionPlanTypeEnum = pgEnum("subscription_plan_type", [
  "free",
  "premium",
  "enterprise",
]);

export const subscriptionProviderEnum = pgEnum("subscription_provider", [
  "stripe",
  "paypal",
  "apple",
  "manual",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "trialing",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "duplicate_alert",
  "budget_warning",
  "sync_error",
  "system_update",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  locale: text("locale").default("es-CO").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  notificationPreferences: jsonb("notification_preferences")
    .default(defaultJsonb)
    .notNull(),
}).enableRLS();

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: workspaceTypeEnum("type").notNull(),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
  licenseKey: text("license_key"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export const workspaceUsers = pgTable(
  "workspace_users",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull(),
  },
  (table) => [
    primaryKey({
      name: "workspace_users_workspace_id_user_id_pk",
      columns: [table.workspaceId, table.userId],
    }),
    index("workspace_users_user_id_idx").on(table.userId),
  ],
).enableRLS();

export const bankConnections = pgTable(
  "bank_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    institutionName: text("institution_name").notNull(),
    apiToken: text("api_token").notNull(),
    syncStatus: bankSyncStatusEnum("sync_status").default("active").notNull(),
  },
  (table) => [index("bank_connections_workspace_id_idx").on(table.workspaceId)],
).enableRLS();

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    bankConnectionId: uuid("bank_connection_id").references(
      () => bankConnections.id,
      { onDelete: "set null" },
    ),
    parentAccountId: uuid("parent_account_id").references(
      (): AnyPgColumn => accounts.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    currency: varchar("currency", { length: 3 }),
    isSystemDefault: boolean("is_system_default").default(false).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("accounts_workspace_id_idx").on(table.workspaceId),
    index("accounts_bank_connection_id_idx").on(table.bankConnectionId),
    index("accounts_parent_account_id_idx").on(table.parentAccountId),
    check(
      "accounts_currency_matches_type_check",
      sql`((${table.type} = 'container' and ${table.currency} is null) or (${table.type} <> 'container' and ${table.currency} is not null))`,
    ),
  ],
).enableRLS();

export const accountSnapshots = pgTable(
  "account_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    statementDate: date("statement_date").notNull(),
    reportedBalanceCents: bigint("reported_balance_cents", {
      mode: "bigint",
    }).notNull(),
    systemBalanceCents: bigint("system_balance_cents", {
      mode: "bigint",
    }).notNull(),
    isReconciled: boolean("is_reconciled").default(false).notNull(),
  },
  (table) => [
    index("account_snapshots_account_id_idx").on(table.accountId),
    index("account_snapshots_account_statement_date_idx").on(
      table.accountId,
      table.statementDate,
    ),
  ],
).enableRLS();

export const areas = pgTable(
  "areas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentAreaId: uuid("parent_area_id").references(
      (): AnyPgColumn => areas.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
  },
  (table) => [
    index("areas_workspace_id_idx").on(table.workspaceId),
    index("areas_parent_area_id_idx").on(table.parentAreaId),
  ],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    parentCategoryId: uuid("parent_category_id").references(
      (): AnyPgColumn => categories.id,
      { onDelete: "set null" },
    ),
    nameKey: text("name_key").notNull(),
    metadata: jsonb("metadata").default(defaultJsonb).notNull(),
  },
  (table) => [
    index("categories_workspace_id_idx").on(table.workspaceId),
    index("categories_parent_category_id_idx").on(table.parentCategoryId),
  ],
).enableRLS();

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: transactionTypeEnum("type").notNull(),
    financialNature: financialNatureEnum("financial_nature").notNull(),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    transactionDate: timestamp("transaction_date", {
      withTimezone: true,
    }).notNull(),
    description: text("description").notNull(),
    origin: transactionOriginEnum("origin").default("manual").notNull(),
    status: transactionStatusEnum("status")
      .default("pending_review")
      .notNull(),
    duplicateFlag: boolean("duplicate_flag").default(false).notNull(),
    metadata: jsonb("metadata").default(defaultJsonb).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    attachmentUrl: text("attachment_url"),
    taxAmountCents: bigint("tax_amount_cents", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    areaId: uuid("area_id").references(() => areas.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_account_date_idx").on(
      table.accountId,
      table.transactionDate,
    ),
    index("transactions_category_id_idx").on(table.categoryId),
    index("transactions_area_id_idx").on(table.areaId),
  ],
).enableRLS();

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    entityName: text("entity_name").notNull(),
    entityId: uuid("entity_id").notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: auditActionEnum("action").notNull(),
    oldValues: jsonb("old_values").default(defaultJsonb).notNull(),
    newValues: jsonb("new_values").default(defaultJsonb).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_workspace_id_idx").on(table.workspaceId),
    index("audit_logs_changed_by_user_id_idx").on(table.changedByUserId),
    index("audit_logs_entity_idx").on(table.entityName, table.entityId),
  ],
).enableRLS();

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentBudgetId: uuid("parent_budget_id").references(
      (): AnyPgColumn => budgets.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    amountLimitCents: bigint("amount_limit_cents", {
      mode: "bigint",
    }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    period: budgetPeriodEnum("period").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    alertThreshold: numeric("alert_threshold", {
      precision: 5,
      scale: 2,
    })
      .default("80.00")
      .notNull(),
    areaId: uuid("area_id").references(() => areas.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("budgets_workspace_id_idx").on(table.workspaceId),
    index("budgets_parent_budget_id_idx").on(table.parentBudgetId),
    index("budgets_area_id_idx").on(table.areaId),
  ],
).enableRLS();

export const budgetCategories = pgTable(
  "budget_categories",
  {
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "budget_categories_budget_id_category_id_pk",
      columns: [table.budgetId, table.categoryId],
    }),
    index("budget_categories_category_id_idx").on(table.categoryId),
  ],
).enableRLS();

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .unique()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    planType: subscriptionPlanTypeEnum("plan_type").default("free").notNull(),
    provider: subscriptionProviderEnum("provider").default("manual").notNull(),
    providerSubscriptionId: text("provider_subscription_id"),
    status: subscriptionStatusEnum("status").default("active").notNull(),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("subscriptions_workspace_id_idx").on(table.workspaceId)],
).enableRLS();

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    amountPaidCents: bigint("amount_paid_cents", { mode: "bigint" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    invoicePdfUrl: text("invoice_pdf_url").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("invoices_workspace_id_idx").on(table.workspaceId)],
).enableRLS();

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: notificationTypeEnum("type").notNull(),
    messageKey: text("message_key").notNull(),
    contextData: jsonb("context_data").default(defaultJsonb).notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_workspace_id_idx").on(table.workspaceId),
    index("notifications_user_id_idx").on(table.userId),
  ],
).enableRLS();
