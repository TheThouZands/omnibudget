import type { CsvDocument } from "../models/csv-document";
import type { StatementIssue, StatementReview, StatementReviewRow } from "../models/statement";
import { normalizeAmount, normalizeDate } from "./normalize-values";
import { validateOptions } from "./validate-options";

/** Normalize one file without reading accounts, sessions, or a database. */
export function reviewStatement(document: CsvDocument, input: unknown): StatementReview {
  const options = validateOptions(input, document.headers.length);
  const rows: StatementReviewRow[] = document.rows.map((row) => {
    const raw = {
      date: row.cells[options.columns.date] ?? "",
      description: row.cells[options.columns.description] ?? "",
      amount: row.cells[options.columns.amount] ?? "",
    };
    const issues: StatementIssue[] = [];
    if (row.cells.length !== document.headers.length) issues.push("column_count");

    const transactionDate = normalizeDate(raw.date, options.dateFormat);
    if (!transactionDate) issues.push("invalid_date");
    const description = raw.description.trim();
    if (!description) issues.push("empty_description");
    if (description.length > 500) issues.push("description_too_long");
    const amount = normalizeAmount(raw.amount, options.decimalSeparator);
    if (amount.issue) issues.push(amount.issue);

    return {
      sourceLine: row.lineNumber,
      raw,
      issues,
      transaction: issues.length === 0 && transactionDate && !amount.issue ? {
        transactionDate,
        description,
        amountMinor: amount.amountMinor,
        direction: amount.direction,
        currency: options.currency,
        origin: "csv_import",
        status: "pending_review",
        duplicateFlag: false,
        duplicateGroup: null,
      } : null,
    };
  });

  const groups = new Map<string, StatementReviewRow[]>();
  for (const row of rows) {
    const transaction = row.transaction;
    if (!transaction) continue;
    const key = JSON.stringify([
      transaction.transactionDate,
      transaction.description.normalize("NFKC").replace(/\s+/g, " ").toLowerCase(),
      transaction.amountMinor,
      transaction.direction,
      transaction.currency,
    ]);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  // Flag every group member, including the first; never delete a possible duplicate.
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const row of group) {
      row.transaction!.duplicateFlag = true;
      row.transaction!.duplicateGroup = group[0].sourceLine;
    }
  }

  const validRows = rows.filter((row) => row.transaction !== null).length;
  return {
    rows,
    summary: {
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      duplicateRows: rows.filter((row) => row.transaction?.duplicateFlag).length,
    },
  };
}
