import { describe, expect, it } from "vitest";
import type { CsvDocument } from "../models/csv-document";
import { StatementInputError, type StatementOptions } from "../models/statement";
import { normalizeAmount, normalizeDate } from "./normalize-values";
import { reviewStatement } from "./review-statement";
import { validateOptions } from "./validate-options";

function defaultOptions(): StatementOptions {
  return {
    columns: { date: 0, description: 1, amount: 2 },
    dateFormat: "ymd",
    decimalSeparator: ".",
    currency: "COP",
  };
}

function documentFor(
  rows: string[][],
  headers = ["date", "description", "amount"],
): CsvDocument {
  return {
    delimiter: ",",
    headers,
    rows: rows.map((cells, index) => ({ lineNumber: index + 2, cells })),
  };
}

function expectOptionsError(input: unknown, code: StatementInputError["code"]) {
  try {
    validateOptions(input, 3);
    expect.fail("Expected invalid statement options");
  } catch (error) {
    expect(error).toBeInstanceOf(StatementInputError);
    expect((error as StatementInputError).code).toBe(code);
  }
}

describe("normalizeDate", () => {
  it.each([
    ["2026-08-27", "ymd", "2026-08-27"],
    ["27/08/2026", "dmy", "2026-08-27"],
    ["08/27/2026", "mdy", "2026-08-27"],
    ["01/02/2026", "dmy", "2026-02-01"],
    ["01/02/2026", "mdy", "2026-01-02"],
    ["2000-02-29", "ymd", "2000-02-29"],
    ["29/02/2024", "dmy", "2024-02-29"],
    ["02/29/2024", "mdy", "2024-02-29"],
    ["2026-04-30", "ymd", "2026-04-30"],
    ["2026-12-31", "ymd", "2026-12-31"],
    ["1900-01-01", "ymd", "1900-01-01"],
    ["2100-12-31", "ymd", "2100-12-31"],
    ["  2026-08-27 \t", "ymd", "2026-08-27"],
  ] as const)("normalizes %s in %s mode", (input, format, expected) => {
    expect(normalizeDate(input, format)).toBe(expected);
  });

  it.each([
    ["1900-02-29", "ymd"],
    ["2100-02-29", "ymd"],
    ["2026-02-29", "ymd"],
    ["2024-02-30", "ymd"],
    ["2026-04-31", "ymd"],
    ["2026-00-01", "ymd"],
    ["2026-13-01", "ymd"],
    ["2026-01-00", "ymd"],
    ["2026-01-32", "ymd"],
    ["1899-12-31", "ymd"],
    ["2101-01-01", "ymd"],
    ["2026-8-01", "ymd"],
    ["2026-08-1", "ymd"],
    ["2026/08/27", "ymd"],
    ["27/08/2026", "ymd"],
    ["2026-08-27", "dmy"],
    ["1/02/2026", "dmy"],
    ["01/2/2026", "mdy"],
    ["31/04/2026", "dmy"],
    ["04/31/2026", "mdy"],
    ["08/27/2026", "dmy"],
    ["27/08/2026", "mdy"],
    ["2026-08-27T00:00:00Z", "ymd"],
    ["", "ymd"],
  ] as const)("rejects %s in %s mode without rolling dates forward", (input, format) => {
    expect(normalizeDate(input, format)).toBeNull();
  });
});

describe("normalizeAmount", () => {
  it.each([
    ["1234.56", ".", "123456", "inflow"],
    ["1,234.56", ".", "123456", "inflow"],
    ["-1,234.56", ".", "123456", "outflow"],
    ["(1,234.56)", ".", "123456", "outflow"],
    ["+0.01", ".", "1", "inflow"],
    ["-0.01", ".", "1", "outflow"],
    [" 7.5 ", ".", "750", "inflow"],
    ["123", ".", "12300", "inflow"],
    ["00123.40", ".", "12340", "inflow"],
    ["1234,56", ",", "123456", "inflow"],
    ["1.234,56", ",", "123456", "inflow"],
    ["-1.234,56", ",", "123456", "outflow"],
    ["(1.234,56)", ",", "123456", "outflow"],
    ["+0,01", ",", "1", "inflow"],
    ["-0,01", ",", "1", "outflow"],
    ["7,5", ",", "750", "inflow"],
    ["1,234", ".", "123400", "inflow"],
    ["1.234", ",", "123400", "inflow"],
    ["90071992547409.93", ".", "9007199254740993", "inflow"],
    ["92233720368547758.07", ".", "9223372036854775807", "inflow"],
    ["-92233720368547758.07", ".", "9223372036854775807", "outflow"],
    ["92.233.720.368.547.758,07", ",", "9223372036854775807", "inflow"],
  ] as const)("parses %s with %s decimals exactly", (input, decimal, amountMinor, direction) => {
    expect(normalizeAmount(input, decimal)).toEqual({ amountMinor, direction });
  });

  it.each([
    ["", "."],
    ["   ", ","],
    ["1e3", "."],
    ["NaN", "."],
    ["Infinity", "."],
    ["$1.00", "."],
    ["1 USD", "."],
    ["1 234.56", "."],
    ["1\u00a0234,56", ","],
    [".50", "."],
    ["1.", "."],
    [",50", ","],
    ["1,", ","],
    ["0.001", "."],
    ["0,001", ","],
    ["1,234", ","],
    ["1.234", "."],
    ["12,34.56", "."],
    ["1,23,456.78", "."],
    ["1234,567.89", "."],
    ["1,234,56", "."],
    ["12.34,56", ","],
    ["1.23.456,78", ","],
    ["1234.567,89", ","],
    ["1.234.56", ","],
    ["--1", "."],
    ["+-1", "."],
    ["-+1", "."],
    ["++1", "."],
    ["(-1)", "."],
    ["(+1)", "."],
    ["(1)-", "."],
    ["()", "."],
  ] as const)("rejects malformed or over-precise amount %s (%s)", (input, decimal) => {
    expect(normalizeAmount(input, decimal)).toEqual({ issue: "invalid_amount" });
  });

  it.each([
    ["0", "."],
    ["+0", "."],
    ["-0", "."],
    ["0.00", "."],
    ["-0.00", "."],
    ["(0.00)", "."],
    ["0,00", ","],
    ["(0,00)", ","],
  ] as const)("rejects zero amount %s (%s)", (input, decimal) => {
    expect(normalizeAmount(input, decimal)).toEqual({ issue: "zero_amount" });
  });

  it.each([
    ["92233720368547758.08", "."],
    ["-92233720368547758.08", "."],
    ["92233720368547758,08", ","],
    ["(92.233.720.368.547.758,08)", ","],
    ["1".repeat(41), "."],
  ] as const)("rejects amounts outside the absolute BIGINT range: %s", (input, decimal) => {
    expect(normalizeAmount(input, decimal)).toEqual({ issue: "amount_out_of_range" });
  });
});

describe("validateOptions", () => {
  it.each(["COP", "USD", "EUR"] as const)("accepts supported currency %s", (currency) => {
    const options = { ...defaultOptions(), currency };
    expect(validateOptions(options, 3)).toEqual(options);
  });

  it("returns an independent, allowlisted options object", () => {
    const input = { ...defaultOptions(), unused: "discard" };
    const options = validateOptions(input, 3);
    expect(options).toEqual(defaultOptions());
    expect(options).not.toBe(input);
    expect(options.columns).not.toBe(input.columns);
  });

  it.each([
    { label: "null", input: null },
    { label: "undefined", input: undefined },
    { label: "boolean", input: false },
    { label: "number", input: 1 },
    { label: "string", input: "" },
    { label: "array", input: [] },
  ])("rejects a runtime $label input", ({ input }) => {
    expectOptionsError(input, "invalid_options");
  });

  it.each([
    { columns: undefined },
    { columns: null },
    { columns: "0,1,2" },
    { columns: [0, 1, 2] },
    { columns: {} },
    { columns: { date: 0, description: 1 } },
    { columns: { date: 0, description: 1, amount: 1 } },
  ])("rejects missing, malformed, or repeated mappings: %j", ({ columns }) => {
    expectOptionsError({ ...defaultOptions(), columns }, "invalid_mapping");
  });

  it.each([-1, 3, 0.5, NaN, Infinity, "0", true, null, undefined])(
    "rejects a non-integer or out-of-bounds mapping index: %s",
    (date) => {
      expectOptionsError({
        ...defaultOptions(),
        columns: { date, description: 1, amount: 2 },
      }, "invalid_mapping");
    },
  );

  it.each([
    { dateFormat: "auto" },
    { dateFormat: null },
    { dateFormat: undefined },
    { decimalSeparator: ";" },
    { decimalSeparator: null },
    { decimalSeparator: undefined },
    { currency: "GBP" },
    { currency: "usd" },
    { currency: null },
    { currency: undefined },
  ])("rejects unsupported or missing format options: %j", (patch) => {
    expectOptionsError({ ...defaultOptions(), ...patch }, "invalid_options");
  });
});

describe("reviewStatement", () => {
  it("uses mapped columns, preserves source data, and does not infer financial nature", () => {
    const document = documentFor(
      [["  Café and tea  ", "-1,234.50", "2026-08-27", "unmapped"]],
      ["memo", "value", "posted", "reference"],
    );
    document.rows[0].lineNumber = 8;
    const original = structuredClone(document);
    const review = reviewStatement(document, {
      ...defaultOptions(),
      columns: { date: 2, description: 0, amount: 1 },
    });

    expect(review).toEqual({
      rows: [{
        sourceLine: 8,
        raw: { date: "2026-08-27", description: "  Café and tea  ", amount: "-1,234.50" },
        issues: [],
        transaction: {
          transactionDate: "2026-08-27",
          description: "Café and tea",
          amountMinor: "123450",
          currency: "COP",
          direction: "outflow",
          origin: "csv_import",
          status: "pending_review",
          duplicateFlag: false,
          duplicateGroup: null,
        },
      }],
      summary: { totalRows: 1, validRows: 1, invalidRows: 0, duplicateRows: 0 },
    });
    expect(review.rows[0].transaction).not.toHaveProperty("financialNature");
    expect(document).toEqual(original);
  });

  it("passes the selected date and decimal conventions to normalization", () => {
    const review = reviewStatement(documentFor([["01/02/2026", "Salary", "1.234,56"]]), {
      ...defaultOptions(),
      dateFormat: "dmy",
      decimalSeparator: ",",
      currency: "EUR",
    });
    expect(review.rows[0].transaction).toMatchObject({
      transactionDate: "2026-02-01",
      amountMinor: "123456",
      direction: "inflow",
      currency: "EUR",
    });
  });

  it("reports row width and field errors without creating partial transactions", () => {
    const review = reviewStatement(documentFor([
      ["", "", ""],
      ["2026-08-27"],
      ["2026-08-27", "Coffee", "-2", "extra"],
      ["2026-02-30", "Coffee", "-2"],
      ["2026-08-27", " \t ", "-2"],
      ["2026-08-27", "Coffee", "0"],
      ["2026-08-27", "Coffee", "92233720368547758.08"],
      ["2026-08-27", "Coffee", "-2.001"],
    ]), defaultOptions());

    expect(review.rows.map((row) => row.issues)).toEqual([
      ["invalid_date", "empty_description", "invalid_amount"],
      ["column_count", "empty_description", "invalid_amount"],
      ["column_count"],
      ["invalid_date"],
      ["empty_description"],
      ["zero_amount"],
      ["amount_out_of_range"],
      ["invalid_amount"],
    ]);
    expect(review.rows.every((row) => row.transaction === null)).toBe(true);
    expect(review.rows.map((row) => row.sourceLine)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(review.summary).toEqual({
      totalRows: 8, validRows: 0, invalidRows: 8, duplicateRows: 0,
    });
  });

  it("accepts 500 trimmed description characters and rejects 501", () => {
    const review = reviewStatement(documentFor([
      ["2026-08-27", "  " + "x".repeat(500) + "  ", "-2"],
      ["2026-08-27", "x".repeat(501), "-2"],
    ]), defaultOptions());

    expect(review.rows[0].issues).toEqual([]);
    expect(review.rows[0].transaction?.description).toHaveLength(500);
    expect(review.rows[1].issues).toEqual(["description_too_long"]);
    expect(review.rows[1].transaction).toBeNull();
    expect(review.summary).toEqual({
      totalRows: 2, validRows: 1, invalidRows: 1, duplicateRows: 0,
    });
  });

  it("flags every normalized duplicate while distinguishing direction, date, amount, and description", () => {
    const document = documentFor([
      ["2026-08-27", "Coffee Shop", "-2.50"],
      ["2026-08-27", " COFFEE  SHOP ", "(2.50)"],
      ["2026-08-27", "ＣＯＦＦＥＥ　ＳＨＯＰ", "-2.5"],
      ["2026-08-27", "Coffee Shop", "+2.50"],
      ["2026-08-28", "Coffee Shop", "-2.50"],
      ["2026-08-27", "Coffee Shop", "-2.51"],
      ["2026-08-27", "Tea Shop", "-2.50"],
      ["2026-08-27", "Rent", "-800"],
      ["2026-08-27", " rent ", "-800.00"],
      ["2026-08-27", "Coffee Shop", "-2.500"],
    ]);
    const sourceLines = [2, 4, 5, 6, 7, 8, 9, 10, 12, 13];
    document.rows.forEach((row, index) => { row.lineNumber = sourceLines[index]; });
    const original = structuredClone(document);
    const review = reviewStatement(document, defaultOptions());

    expect(review.rows.map((row) => row.transaction?.duplicateGroup ?? null))
      .toEqual([2, 2, 2, null, null, null, null, 10, 10, null]);
    expect(review.rows.map((row) => row.transaction?.duplicateFlag ?? false))
      .toEqual([true, true, true, false, false, false, false, true, true, false]);
    expect(review.rows.map((row) => row.sourceLine)).toEqual(sourceLines);
    expect(review.rows[9].transaction).toBeNull();
    expect(review.rows[9].issues).toEqual(["invalid_amount"]);
    expect(review.summary).toEqual({
      totalRows: 10, validRows: 9, invalidRows: 1, duplicateRows: 5,
    });
    expect(document).toEqual(original);
  });

  it("does not include invalid rows in duplicate groups", () => {
    const review = reviewStatement(documentFor([
      ["2026-02-30", "Coffee", "-2"],
      ["2026-02-30", "Coffee", "-2"],
    ]), defaultOptions());
    expect(review.rows.every((row) => row.transaction === null)).toBe(true);
    expect(review.summary).toEqual({
      totalRows: 2, validRows: 0, invalidRows: 2, duplicateRows: 0,
    });
  });

  it("does not share duplicate state between review requests", () => {
    const document = documentFor([["2026-08-27", "Coffee", "-2"]]);
    const first = reviewStatement(document, defaultOptions());
    const second = reviewStatement(document, defaultOptions());
    expect(first).toEqual(second);
    expect(first.summary.duplicateRows).toBe(0);
    expect(second.rows[0].transaction?.duplicateFlag).toBe(false);
    expect(second.rows[0].transaction?.duplicateGroup).toBeNull();
  });

  it("validates runtime options before reviewing any rows", () => {
    const document = documentFor([["2026-08-27", "Coffee", "-2"]]);
    expect(() => reviewStatement(document, null)).toThrow("invalid_options");
    expect(() => reviewStatement(document, {
      ...defaultOptions(),
      columns: { date: 0, description: 1, amount: 1 },
    })).toThrow("invalid_mapping");
  });
});
