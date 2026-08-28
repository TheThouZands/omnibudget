import {
  STATEMENT_CURRENCIES,
  STATEMENT_DATE_FORMATS,
  StatementInputError,
  type StatementOptions,
} from "../models/statement";

/** Validate the API boundary without depending on an HTTP framework or UI. */
export function validateOptions(input: unknown, columnCount: number): StatementOptions {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new StatementInputError("invalid_options");
  }

  const options = input as Record<string, unknown>;
  if (!options.columns || typeof options.columns !== "object" || Array.isArray(options.columns)) {
    throw new StatementInputError("invalid_mapping");
  }
  const columns = options.columns as Record<string, unknown>;
  const indices = [columns.date, columns.description, columns.amount];
  if (indices.some((index) => !Number.isInteger(index) || Number(index) < 0 || Number(index) >= columnCount)
    || new Set(indices).size !== 3) {
    throw new StatementInputError("invalid_mapping");
  }
  if (!STATEMENT_DATE_FORMATS.includes(options.dateFormat as StatementOptions["dateFormat"])
    || !STATEMENT_CURRENCIES.includes(options.currency as StatementOptions["currency"])
    || (options.decimalSeparator !== "." && options.decimalSeparator !== ",")) {
    throw new StatementInputError("invalid_options");
  }

  return {
    columns: { date: Number(columns.date), description: Number(columns.description), amount: Number(columns.amount) },
    dateFormat: options.dateFormat as StatementOptions["dateFormat"],
    decimalSeparator: options.decimalSeparator,
    currency: options.currency as StatementOptions["currency"],
  };
}
