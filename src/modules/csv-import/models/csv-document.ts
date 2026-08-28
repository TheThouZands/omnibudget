export const CSV_LIMITS = {
  fileBytes: 2 * 1024 * 1024,
  rows: 5_000,
  columns: 50,
  cellCharacters: 5_000,
} as const;

export const CSV_DELIMITERS = [",", ";", "\t"] as const;
export type CsvDelimiter = (typeof CSV_DELIMITERS)[number];

export type CsvErrorCode =
  | "empty_file"
  | "no_data_rows"
  | "file_too_large"
  | "too_many_rows"
  | "too_many_columns"
  | "cell_too_long"
  | "unclosed_quote"
  | "unexpected_quote"
  | "invalid_encoding";

export class CsvInputError extends Error {
  constructor(
    public readonly code: CsvErrorCode,
    public readonly lineNumber?: number,
  ) {
    super(code);
    this.name = "CsvInputError";
  }
}

export interface CsvRow {
  /** Physical source line; quoted records can span more than one line. */
  lineNumber: number;
  cells: string[];
}

export interface CsvDocument {
  delimiter: CsvDelimiter;
  headers: string[];
  rows: CsvRow[];
}
