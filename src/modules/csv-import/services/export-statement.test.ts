import { describe, expect, it } from "vitest";
import { parseCsv } from "./parse-csv";
import { reviewStatement } from "./review-statement";
import { exportStatement } from "./export-statement";
import type { StatementOptions } from "../models/statement";

const options: StatementOptions = {
  columns: { date: 0, description: 1, amount: 2 },
  dateFormat: "ymd",
  decimalSeparator: ".",
  currency: "COP",
};

const review = reviewStatement(parseCsv([
  "date;description;amount",
  '2026-08-01;"Bogotá, \"\"Central\"\"\nStore";-10.05',
  "2026-08-02;=1+1;90071992547409.93",
  "2026-02-30;Invalid;5",
  "2026-08-02;=1+1;90071992547409.93",
].join("\n"), ";"), options);

describe("exportStatement", () => {
  it("returns lossless JSON with explicit scope and pending-review metadata", () => {
    const result = JSON.parse(exportStatement(review, [4], "json"));
    expect(result.schema_version).toBe(1);
    expect(result.scope).toBe("statement_preparation");
    expect(result.transactions).toEqual([{
      source_line: 4,
      transaction_date: "2026-08-02",
      description: "=1+1",
      amount_cents: "9007199254740993",
      currency: "COP",
      direction: "inflow",
      origin: "csv_import",
      status: "pending_review",
      duplicate_flag: true,
      duplicate_group: 4,
    }]);
  });

  it("quotes CSV cells and round-trips embedded quotes, commas, and line breaks", () => {
    const csv = exportStatement(review, [2], "csv");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const decoded = parseCsv(csv);
    expect(decoded.rows[0].cells[2]).toBe('Bogotá, "Central"\nStore');
    expect(decoded.rows[0].cells[3]).toBe("1005");
  });

  it("keeps original source order and duplicate flags even when a group member is excluded", () => {
    const result = JSON.parse(exportStatement(review, [6, 2], "json"));
    expect(result.transactions.map((row: { source_line: number }) => row.source_line)).toEqual([2, 6]);
    expect(result.transactions[1].duplicate_flag).toBe(true);
  });

  it.each(["=1+1", "+1+1", "-1+1", "@SUM(A1)", "\u0001=1+1"])("neutralizes a spreadsheet formula: %s", (description) => {
    const data = reviewStatement(parseCsv(`date;description;amount\n2026-08-01;${description};1`, ";"), options);
    expect(parseCsv(exportStatement(data, [2], "csv")).rows[0].cells[2]).toBe("'" + description);
    expect(JSON.parse(exportStatement(data, [2], "json")).transactions[0].description).toBe(description);
  });

  it.each([null, "2", ["2"], [2, 2], [999], [5], [2, 5], [2.5]])("rejects invalid or non-exportable selections: %s", (selection) => {
    expect(() => exportStatement(review, selection, "json")).toThrow("invalid_selection");
  });

  it("requires an explicit non-empty selection", () => {
    expect(() => exportStatement(review, [], "csv")).toThrow("empty_selection");
  });
});
