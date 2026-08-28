import type { CsvDelimiter, CsvRow } from "./csv-document";
import type { StatementReview } from "./statement";

export interface CsvInspection {
  delimiter: CsvDelimiter;
  headers: string[];
  sampleRows: CsvRow[];
  totalRows: number;
}

export type CsvReviewResponse = StatementReview;

export interface CsvErrorResponse {
  error: { code: string; lineNumber?: number };
}
