import { describe, expect, it } from "vitest";
import { CSV_LIMITS } from "../models/csv-document";
import type { StatementOptions } from "../models/statement";
import { exportCsvRequest, inspectCsvRequest, reviewCsvRequest } from "./csv-controller";

const REQUEST_LIMIT = CSV_LIMITS.fileBytes + 64 * 1024;
const PRIVATE_SOURCE = "private-account-test-marker";
const CSV_TEXT = "date,description,amount\n2026-08-27,Café Bogotá,-12.34\n2026-08-28,Salary,100";

function options(): StatementOptions {
  return {
    columns: { date: 0, description: 1, amount: 2 },
    dateFormat: "ymd",
    decimalSeparator: ".",
    currency: "COP",
  };
}

function fileForm(csv = CSV_TEXT): FormData {
  const form = new FormData();
  form.set("file", new File([csv], "statement.csv", { type: "text/csv" }));
  return form;
}

function reviewForm(csv = CSV_TEXT): FormData {
  const form = fileForm(csv);
  form.set("options", JSON.stringify(options()));
  return form;
}

function exportForm(csv = CSV_TEXT): FormData {
  const form = reviewForm(csv);
  form.set("selectedRows", JSON.stringify([2]));
  form.set("format", "json");
  return form;
}

function post(form: FormData, headers?: HeadersInit): Request {
  return new Request("http://localhost/api/csv", { method: "POST", body: form, headers });
}

function expectPrivateHeaders(response: Response) {
  expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
}

async function expectError(response: Response, status: number, code: string, lineNumber?: number) {
  expect(response.status).toBe(status);
  expectPrivateHeaders(response);
  const body = await response.json();
  expect(body).toEqual({ error: { code, ...(lineNumber ? { lineNumber } : {}) } });
  expect(JSON.stringify(body)).not.toContain(PRIVATE_SOURCE);
}

describe("inspectCsvRequest", () => {
  it("returns headers, at most five source rows, and a total without caching", async () => {
    const rows = Array.from({ length: 7 }, (_, index) => ["2026-08-27", "Item " + index, "-1"]);
    const csv = ["fecha;detalle;valor", ...rows.map((row) => row.join(";"))].join("\n");
    const response = await inspectCsvRequest(post(fileForm(csv)));

    expect(response.status).toBe(200);
    expectPrivateHeaders(response);
    expect(await response.json()).toEqual({
      delimiter: ";",
      headers: ["fecha", "detalle", "valor"],
      sampleRows: rows.slice(0, 5).map((cells, index) => ({ lineNumber: index + 2, cells })),
      totalRows: 7,
    });
  });
});

describe("request validation", () => {
  it.each(["application/json", "text/plain", "multipart/form-data"])("rejects unsupported request content type %s", async (contentType) => {
    const request = new Request("http://localhost/api/csv", {
      method: "POST", body: PRIVATE_SOURCE, headers: { "Content-Type": contentType },
    });
    await expectError(await inspectCsvRequest(request), 415, "multipart_required");
  });

  it("rejects a missing request body", async () => {
    const request = new Request("http://localhost/api/csv", {
      method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=missing" },
    });
    await expectError(await inspectCsvRequest(request), 400, "invalid_request");
  });

  it("rejects malformed multipart data without returning its contents", async () => {
    const request = new Request("http://localhost/api/csv", {
      method: "POST", body: PRIVATE_SOURCE,
      headers: { "Content-Type": "multipart/form-data; boundary=missing" },
    });
    await expectError(await inspectCsvRequest(request), 400, "invalid_request");
  });

  it("requires a File rather than a missing field or a string", async () => {
    await expectError(await inspectCsvRequest(post(new FormData())), 400, "file_required");
    const form = new FormData();
    form.set("file", PRIVATE_SOURCE);
    await expectError(await inspectCsvRequest(post(form)), 400, "file_required");
  });

  it("rejects a non-CSV filename", async () => {
    const form = new FormData();
    form.set("file", new File([PRIVATE_SOURCE], "statement.txt"));
    await expectError(await inspectCsvRequest(post(form)), 415, "unsupported_file");
  });

  it("accepts an uppercase CSV extension", async () => {
    const form = new FormData();
    form.set("file", new File([CSV_TEXT], "statement.CSV", { type: "application/octet-stream" }));
    expect((await inspectCsvRequest(post(form))).status).toBe(200);
  });

  it.each(["|", "", "automatic"])("rejects unsupported delimiter %s", async (delimiter) => {
    const form = fileForm();
    form.set("delimiter", delimiter);
    await expectError(await inspectCsvRequest(post(form)), 400, "invalid_delimiter");
  });

  it.each(["file", "delimiter", "options", "selectedRows", "format"])("rejects duplicate %s fields", async (key) => {
    const form = exportForm();
    form.set("delimiter", "auto");
    form.append(key, PRIVATE_SOURCE);
    await expectError(await exportCsvRequest(post(form)), 400, "invalid_request");
  });

  it.each(["review", "transactions", "accountId"])("rejects unknown or client-computed field %s", async (key) => {
    const form = exportForm();
    form.set(key, PRIVATE_SOURCE);
    await expectError(await exportCsvRequest(post(form)), 400, "invalid_request");
  });

  it("rejects malformed UTF-8 bytes before CSV parsing", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([0x61, 0x2c, 0x62, 0x0a, 0x31, 0x2c, 0xc3, 0x28])], "statement.csv"));
    await expectError(await inspectCsvRequest(post(form)), 400, "invalid_encoding");
  });

  it.each([
    { csv: 'a,b\n1,"' + PRIVATE_SOURCE, code: "unclosed_quote" },
    { csv: 'a,b\n1,' + PRIVATE_SOURCE + '"bad', code: "unexpected_quote" },
  ])("reports safe line metadata for $code", async ({ csv, code }) => {
    await expectError(await inspectCsvRequest(post(fileForm(csv))), 400, code, 2);
  });
});

describe("JSON field validation", () => {
  it.each([
    { field: "options", code: "invalid_options" },
    { field: "selectedRows", code: "invalid_selection" },
  ])("rejects malformed JSON in $field", async ({ field, code }) => {
    const form = exportForm();
    form.set(field, "{" + PRIVATE_SOURCE);
    await expectError(await exportCsvRequest(post(form)), 400, code);
  });

  it.each([
    { field: "options", code: "invalid_options" },
    { field: "selectedRows", code: "invalid_selection" },
    { field: "format", code: "invalid_format" },
    { field: "delimiter", code: "invalid_delimiter" },
  ])("rejects a File where $field must be text", async ({ field, code }) => {
    const form = exportForm();
    form.set(field, new File([PRIVATE_SOURCE], "field.txt"));
    await expectError(await exportCsvRequest(post(form)), 400, code);
  });

  it.each([
    { field: "options", code: "invalid_options" },
    { field: "selectedRows", code: "invalid_selection" },
    { field: "format", code: "invalid_format" },
  ])("rejects a missing $field", async ({ field, code }) => {
    const form = exportForm();
    form.delete(field);
    await expectError(await exportCsvRequest(post(form)), 400, code);
  });

  it.each([
    { value: null, code: "invalid_options" },
    { value: [], code: "invalid_options" },
    { value: {}, code: "invalid_mapping" },
    { value: { ...options(), dateFormat: "auto" }, code: "invalid_options" },
    { value: { ...options(), decimalSeparator: ";" }, code: "invalid_options" },
    { value: { ...options(), currency: "JPY" }, code: "invalid_options" },
    { value: { ...options(), columns: { date: 0, description: 1, amount: 1 } }, code: "invalid_mapping" },
    { value: { ...options(), columns: { date: 0, description: 1, amount: 3 } }, code: "invalid_mapping" },
  ])("validates parsed options at the API boundary (%j)", async ({ value, code }) => {
    const form = reviewForm();
    form.set("options", JSON.stringify(value));
    await expectError(await reviewCsvRequest(post(form)), 400, code);
  });

  it.each(["xlsx", "JSON", ""])("rejects export format %s", async (format) => {
    const form = exportForm();
    form.set("format", format);
    await expectError(await exportCsvRequest(post(form)), 400, "invalid_format");
  });

  it.each([
    { value: null, code: "invalid_selection" },
    { value: {}, code: "invalid_selection" },
    { value: ["2"], code: "invalid_selection" },
    { value: [2.5], code: "invalid_selection" },
    { value: [2, 2], code: "invalid_selection" },
    { value: [999], code: "invalid_selection" },
    { value: [], code: "empty_selection" },
  ])("validates selected source rows (%j)", async ({ value, code }) => {
    const form = exportForm();
    form.set("selectedRows", JSON.stringify(value));
    await expectError(await exportCsvRequest(post(form)), 400, code);
  });
});

describe("exportCsvRequest", () => {
  it("exports only selected valid source rows as an uncached JSON attachment", async () => {
    const form = exportForm("date,description,amount\nbad-date,Invalid,-1\n2026-08-27,Café Bogotá,-12.34");
    form.set("selectedRows", "[3]");
    const response = await exportCsvRequest(post(form));
    expect(response.status).toBe(200);
    expectPrivateHeaders(response);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="omnibudget-statement.json"');
    expect(await response.json()).toEqual({
      schema_version: 1,
      scope: "statement_preparation",
      transactions: [{
        source_line: 3, transaction_date: "2026-08-27", description: "Café Bogotá",
        amount_cents: "1234", currency: "COP", direction: "outflow", origin: "csv_import",
        status: "pending_review", duplicate_flag: false, duplicate_group: null,
      }],
    });
  });

  it("exports a UTF-8 CSV attachment with a BOM", async () => {
    const form = exportForm();
    form.set("format", "csv");
    const response = await exportCsvRequest(post(form));
    expect(response.status).toBe(200);
    expectPrivateHeaders(response);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="omnibudget-statement.csv"');
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    expect(text).toContain('"Café Bogotá"');
    expect(text).toContain('"1234"');
    expect(text).not.toContain("Salary");
    expect(text.endsWith("\r\n")).toBe(true);
  });

  it("revalidates the original file instead of accepting an invalid selected row", async () => {
    const form = exportForm("date,description,amount\nbad-date," + PRIVATE_SOURCE + ",-1\n2026-08-27,Valid,-2");
    await expectError(await exportCsvRequest(post(form)), 400, "invalid_selection");
  });
});

describe("request and file byte limits", () => {
  it("copies tiny transport chunks before their source buffer is reused", async () => {
    const encoded = post(fileForm());
    const source = new Uint8Array(await encoded.arrayBuffer());
    const byte = new Uint8Array(1);
    let offset = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === source.length) controller.close();
        else {
          byte[0] = source[offset++];
          controller.enqueue(byte);
        }
      },
    }, { highWaterMark: 0 });
    const init = { method: "POST", body, headers: encoded.headers, duplex: "half" };
    const response = await inspectCsvRequest(new Request("http://localhost/api/csv", init));
    expect(response.status).toBe(200);
    expect((await response.json()).totalRows).toBe(2);
  });

  it.each([undefined, "1"])("counts actual multipart bytes with Content-Length %s", async (declaredLength) => {
    const encoded = post(fileForm("x".repeat(REQUEST_LIMIT + 128 * 1024)));
    const bytes = new Uint8Array(await encoded.arrayBuffer());
    const headers = new Headers(encoded.headers);
    if (declaredLength) headers.set("Content-Length", declaredLength);
    let offset = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === bytes.length) {
          controller.close();
          return;
        }
        const end = Math.min(offset + 64 * 1024, bytes.length);
        controller.enqueue(bytes.slice(offset, end));
        offset = end;
      },
      cancel() { cancelled = true; },
    });
    const init = { method: "POST", body, headers, duplex: "half" };
    const request = new Request("http://localhost/api/csv", init);
    expect(request.headers.get("content-length")).toBe(declaredLength ?? null);
    await expectError(await inspectCsvRequest(request), 413, "request_too_large");
    expect(cancelled).toBe(true);
  });

  it("rejects a declared request length above the request cap", async () => {
    const request = post(fileForm(), { "Content-Length": String(REQUEST_LIMIT + 1) });
    await expectError(await inspectCsvRequest(request), 413, "request_too_large");
  });

  it("applies the smaller file limit to UTF-8 bytes rather than character count", async () => {
    const csv = "é".repeat(CSV_LIMITS.fileBytes / 2 + 1);
    expect(csv.length).toBeLessThan(CSV_LIMITS.fileBytes);
    await expectError(await inspectCsvRequest(post(fileForm(csv))), 413, "file_too_large");
  });

  it("accepts a file at exactly the two-MiB limit", async () => {
    const fullRow = "x".repeat(CSV_LIMITS.cellCharacters - 1) + "\n";
    const completeRows = Math.floor((CSV_LIMITS.fileBytes - 2) / fullRow.length);
    const remainder = CSV_LIMITS.fileBytes - 2 - completeRows * fullRow.length;
    const csv = "a\n" + fullRow.repeat(completeRows) + "y".repeat(remainder);
    expect(new TextEncoder().encode(csv).byteLength).toBe(CSV_LIMITS.fileBytes);
    const response = await inspectCsvRequest(post(fileForm(csv)));
    expect(response.status).toBe(200);
    expectPrivateHeaders(response);
    expect((await response.json()).totalRows).toBe(completeRows + 1);
  });
});

describe("request isolation and safe failures", () => {
  it("does not retain duplicate state from a previous review request", async () => {
    const row = "2026-08-27,Coffee,-2";
    const repeated = "date,description,amount\n" + row + "\n" + row;
    const first = await reviewCsvRequest(post(reviewForm(repeated)));
    expect((await first.json()).summary.duplicateRows).toBe(2);
    const second = await reviewCsvRequest(post(reviewForm("date,description,amount\n" + row)));
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.summary).toEqual({ totalRows: 1, validRows: 1, invalidRows: 0, duplicateRows: 0 });
    expect(body.rows[0].transaction.duplicateFlag).toBe(false);
    expect(body.rows[0].transaction.duplicateGroup).toBeNull();
  });

  it("returns row-level validation issues as a successful review", async () => {
    const form = reviewForm("date,description,amount\n2026-08-27,Valid,-2\nbad-date,Invalid,0");
    const response = await reviewCsvRequest(post(form));
    expect(response.status).toBe(200);
    expectPrivateHeaders(response);
    const body = await response.json();
    expect(body.summary).toEqual({ totalRows: 2, validRows: 1, invalidRows: 1, duplicateRows: 0 });
    expect(body.rows[1].issues).toEqual(["invalid_date", "zero_amount"]);
    expect(body.rows[1].transaction).toBeNull();
  });

  it("does not expose an unexpected exception or source content", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.error(new Error(PRIVATE_SOURCE)); },
    });
    const init = {
      method: "POST", body, duplex: "half",
      headers: { "Content-Type": "multipart/form-data; boundary=test" },
    };
    await expectError(await inspectCsvRequest(new Request("http://localhost/api/csv", init)), 500, "processing_failed");
  });
});

describe("reviewCsvRequest", () => {
  it("returns exact normalized values from the original UTF-8 CSV", async () => {
    const form = reviewForm("posted;memo;value\n27/08/2026;Café Bogotá;-1.234,56");
    form.set("delimiter", ";");
    form.set("options", JSON.stringify({ ...options(), dateFormat: "dmy", decimalSeparator: "," }));
    const response = await reviewCsvRequest(post(form));
    expect(response.status).toBe(200);
    expectPrivateHeaders(response);
    const body = await response.json();
    expect(body.summary).toEqual({ totalRows: 1, validRows: 1, invalidRows: 0, duplicateRows: 0 });
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toEqual({
      sourceLine: 2,
      raw: { date: "27/08/2026", description: "Café Bogotá", amount: "-1.234,56" },
      issues: [],
      transaction: {
        transactionDate: "2026-08-27", description: "Café Bogotá", amountMinor: "123456",
        currency: "COP", direction: "outflow", origin: "csv_import", status: "pending_review",
        duplicateFlag: false, duplicateGroup: null,
      },
    });
  });
});
