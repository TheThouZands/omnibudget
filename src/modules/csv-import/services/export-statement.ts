import { StatementInputError, type StatementReview } from "../models/statement";

export type StatementExportFormat = "csv" | "json";

/** Export only explicitly selected, valid rows; invalid selections are never ignored. */
export function exportStatement(review: StatementReview, selection: unknown, format: StatementExportFormat): string {
  if (!Array.isArray(selection) || selection.some((line) => !Number.isInteger(line))
    || new Set(selection).size !== selection.length) {
    throw new StatementInputError("invalid_selection");
  }
  if (selection.length === 0) throw new StatementInputError("empty_selection");

  const selected = new Set<number>(selection);
  const rows = review.rows.filter((row) => selected.has(row.sourceLine) && row.transaction);
  if (rows.length !== selected.size) throw new StatementInputError("invalid_selection");

  const transactions = rows.map(({ sourceLine, transaction }) => ({
    source_line: sourceLine,
    transaction_date: transaction!.transactionDate,
    description: transaction!.description,
    amount_cents: transaction!.amountMinor,
    currency: transaction!.currency,
    direction: transaction!.direction,
    origin: transaction!.origin,
    status: transaction!.status,
    duplicate_flag: transaction!.duplicateFlag,
    duplicate_group: transaction!.duplicateGroup,
  }));

  if (format === "json") {
    return JSON.stringify({ schema_version: 1, scope: "statement_preparation", transactions }, null, 2);
  }

  const headers = Object.keys(transactions[0]);
  const records = transactions.map((transaction) => Object.values({
    ...transaction,
    description: protectSpreadsheetCell(transaction.description),
  }));
  // Quote every cell and preserve Unicode; JSON keeps descriptions completely unchanged.
  return "\uFEFF" + [headers, ...records].map((record) =>
    record.map((value) => '"' + String(value ?? "").replaceAll('"', '""') + '"').join(","),
  ).join("\r\n") + "\r\n";
}

function protectSpreadsheetCell(value: string): string {
  // CSV quoting alone does not prevent spreadsheet applications from running formulas.
  return /^[\s\p{Cc}]*[=+@-]/u.test(value) ? "'" + value : value;
}
