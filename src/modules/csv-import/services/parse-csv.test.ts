import { describe, expect, it } from "vitest";
import { CSV_LIMITS, CsvInputError } from "../models/csv-document";
import { detectDelimiter, parseCsv } from "./parse-csv";

describe("parseCsv", () => {
  it("reads a BOM, Windows newlines, and source line numbers", () => {
    expect(parseCsv("\uFEFFdate,description,amount\r\n2026-08-01,Coffee,-2.50\r\n")).toEqual({
      delimiter: ",",
      headers: ["date", "description", "amount"],
      rows: [{ lineNumber: 2, cells: ["2026-08-01", "Coffee", "-2.50"] }],
    });
  });

  it("retains quoted separators, newlines, and escaped quotes", () => {
    const result = parseCsv('date;description;amount\n2026-08-01;"Store; \"\"Central\"\"\r\nBogotá";-2,50\n2026-08-02;Rent;-10');
    expect(result.delimiter).toBe(";");
    expect(result.rows[0].cells[1]).toBe('Store; "Central"\nBogotá');
    expect(result.rows[1].lineNumber).toBe(4);
  });

  it("detects tabs and allows an explicit separator", () => {
    expect(parseCsv("date\tdescription\tamount\n2026-08-01\tCoffee\t-2").delimiter).toBe("\t");
    expect(parseCsv("A,B;C\n1,2;3", ";").headers).toEqual(["A,B", "C"]);
  });

  it("keeps blank and duplicate headers addressable by index", () => {
    expect(parseCsv("date,,date\n1,2,3").headers).toEqual(["date", "", "date"]);
  });

  it("retains delimiter-only and quoted-empty rows instead of losing data", () => {
    const result = parseCsv(',,\n,,\n"","",""\n2026-08-01,Coffee,-2');
    expect(result.headers).toEqual(["", "", ""]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toEqual({ lineNumber: 2, cells: ["", "", ""] });
    expect(result.rows[1].lineNumber).toBe(3);
  });

  it("detects the separator after leading blank lines without changing row numbers", () => {
    const result = parseCsv("\n \r\ndate;description;amount\n2026-08-01;Coffee;-2");
    expect(result.delimiter).toBe(";");
    expect(result.rows[0].lineNumber).toBe(4);
  });

  it("skips empty lines but preserves irregular row widths for validation", () => {
    const result = parseCsv("date,description,amount\n\n2026-08-01,Coffee\n2026-08-02,Tea,-1,extra");
    expect(result.rows.map((row) => [row.lineNumber, row.cells.length])).toEqual([[3, 2], [4, 4]]);
  });

  it.each([
    ["", "empty_file"],
    [" \n\r\n", "empty_file"],
    ["date,description,amount\n", "no_data_rows"],
    ['a,b\n1,"two', "unclosed_quote"],
    ['a,b\n1,two"three', "unexpected_quote"],
    ['a,b\n1,"two"three', "unexpected_quote"],
    ["a,b\n1,\u0000", "invalid_encoding"],
    ["a,b\n1,\uFFFD", "invalid_encoding"],
  ])("rejects invalid content (%s)", (input, code) => {
    expect(() => parseCsv(input)).toThrow(code);
  });

  it("enforces the file size before parsing", () => {
    expect(() => parseCsv("é".repeat(CSV_LIMITS.fileBytes / 2 + 1))).toThrow("file_too_large");
  });

  it("accepts the maximum row count and rejects the next row", () => {
    const input = "a,b\n" + "1,2\n".repeat(CSV_LIMITS.rows);
    expect(parseCsv(input).rows).toHaveLength(CSV_LIMITS.rows);
    expect(() => parseCsv(input + "1,2")).toThrow("too_many_rows");
  });

  it("limits column count and cell length", () => {
    expect(() => parseCsv("a,".repeat(CSV_LIMITS.columns) + "a\n1")).toThrow("too_many_columns");
    expect(() => parseCsv("a\n" + "x".repeat(CSV_LIMITS.cellCharacters + 1))).toThrow("cell_too_long");
  });

  it("reports the start of a multiline malformed record", () => {
    try {
      parseCsv('a,b\n1,"two\nthree');
      expect.fail("Expected a quote error");
    } catch (error) {
      expect(error).toBeInstanceOf(CsvInputError);
      expect((error as CsvInputError).lineNumber).toBe(2);
    }
  });
});

describe("detectDelimiter", () => {
  it("does not count separators inside quoted headers", () => {
    expect(detectDelimiter('"a,b,c";date;amount\n1;2;3')).toBe(";");
  });
});
