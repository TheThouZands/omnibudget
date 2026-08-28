import { CsvInputError } from "../models/csv-document";
import { StatementInputError } from "../models/statement";
import type { CsvInspection } from "../models/api";
import { reviewStatement } from "../services/review-statement";
import { exportStatement } from "../services/export-statement";
import { CsvRequestError, readJsonField, readSubmission } from "./read-submission";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

function failure(error: unknown): Response {
  let code = "processing_failed";
  let status = 500;
  let lineNumber: number | undefined;
  if (error instanceof CsvRequestError) {
    code = error.code;
    status = error.status;
  } else if (error instanceof CsvInputError || error instanceof StatementInputError) {
    code = error.code;
    status = code === "file_too_large" ? 413 : 400;
    if (error instanceof CsvInputError) lineNumber = error.lineNumber;
  }
  // Never return file contents, credentials, or an exception stack in an API error.
  return Response.json({ error: { code, ...(lineNumber ? { lineNumber } : {}) } }, {
    status,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
}

/** HTTP adapters use Web Request/Response; the domain does not import Next.js. */
export async function inspectCsvRequest(request: Request): Promise<Response> {
  try {
    const { document } = await readSubmission(request);
    const inspection: CsvInspection = {
      delimiter: document.delimiter,
      headers: document.headers,
      sampleRows: document.rows.slice(0, 5),
      totalRows: document.rows.length,
    };
    return Response.json(inspection, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    return failure(error);
  }
}

export async function reviewCsvRequest(request: Request): Promise<Response> {
  try {
    const { document, form } = await readSubmission(request);
    const options = readJsonField(form, "options", "invalid_options");
    return Response.json(reviewStatement(document, options), { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    return failure(error);
  }
}

export async function exportCsvRequest(request: Request): Promise<Response> {
  try {
    const { document, form } = await readSubmission(request);
    const options = readJsonField(form, "options", "invalid_options");
    const selection = readJsonField(form, "selectedRows", "invalid_selection");
    const format = form.get("format");
    if (format !== "csv" && format !== "json") throw new CsvRequestError("invalid_format");

    // Rebuild the review from the source; browser-supplied financial values are not trusted.
    const review = reviewStatement(document, options);
    const output = exportStatement(review, selection, format);
    return new Response(output, {
      headers: {
        ...PRIVATE_RESPONSE_HEADERS,
        "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="omnibudget-statement.${format}"`,
      },
    });
  } catch (error) {
    return failure(error);
  }
}
