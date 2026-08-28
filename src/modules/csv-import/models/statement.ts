export const STATEMENT_CURRENCIES = ["COP", "USD", "EUR"] as const;
export const STATEMENT_DATE_FORMATS = ["ymd", "dmy", "mdy"] as const;
export type StatementCurrency = (typeof STATEMENT_CURRENCIES)[number];
export type StatementDateFormat = (typeof STATEMENT_DATE_FORMATS)[number];
export type DecimalSeparator = "." | ",";

export interface StatementOptions {
  columns: { date: number; description: number; amount: number };
  dateFormat: StatementDateFormat;
  decimalSeparator: DecimalSeparator;
  currency: StatementCurrency;
}

export type StatementIssue =
  | "column_count"
  | "invalid_date"
  | "empty_description"
  | "description_too_long"
  | "invalid_amount"
  | "zero_amount"
  | "amount_out_of_range";

export interface PreparedTransaction {
  transactionDate: string;
  description: string;
  /** Absolute minor units as a string: JSON numbers cannot preserve every BIGINT. */
  amountMinor: string;
  currency: StatementCurrency;
  /** Direction does not infer financial nature (a deposit can be a refund). */
  direction: "inflow" | "outflow";
  origin: "csv_import";
  status: "pending_review";
  duplicateFlag: boolean;
  duplicateGroup: number | null;
}

export interface StatementReviewRow {
  sourceLine: number;
  raw: { date: string; description: string; amount: string };
  issues: StatementIssue[];
  transaction: PreparedTransaction | null;
}

export interface StatementReview {
  rows: StatementReviewRow[];
  summary: { totalRows: number; validRows: number; invalidRows: number; duplicateRows: number };
}

export class StatementInputError extends Error {
  constructor(public readonly code: "invalid_mapping" | "invalid_options" | "invalid_selection" | "empty_selection") {
    super(code);
    this.name = "StatementInputError";
  }
}
