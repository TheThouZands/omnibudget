import {
  CSV_DELIMITERS,
  CSV_LIMITS,
  CsvInputError,
  type CsvDelimiter,
  type CsvDocument,
  type CsvRow,
} from "../models/csv-document";

/** Detect separators only in the first logical record, outside quoted cells. */
export function detectDelimiter(text: string): CsvDelimiter {
  const counts = new Map<CsvDelimiter, number>(CSV_DELIMITERS.map((value) => [value, 0]));
  let quoted = false;
  let recordStarted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      recordStarted = true;
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted) {
      if (character === "\n" || character === "\r") {
        if (recordStarted) break;
        continue;
      }
      if (character.trim() !== "") recordStarted = true;
      const delimiter = character as CsvDelimiter;
      if (counts.has(delimiter)) {
        recordStarted = true;
        counts.set(delimiter, counts.get(delimiter)! + 1);
      }
    }
  }

  return CSV_DELIMITERS.reduce((best, candidate) =>
    counts.get(candidate)! > counts.get(best)! ? candidate : best,
  );
}

/** Parse bounded UTF-8 CSV with no framework, network, or persistence dependency. */
export function parseCsv(input: string, delimiter?: CsvDelimiter): CsvDocument {
  if (new TextEncoder().encode(input).byteLength > CSV_LIMITS.fileBytes) {
    throw new CsvInputError("file_too_large");
  }

  const text = input.replace(/^\uFEFF/, "");
  if (!text.trim()) throw new CsvInputError("empty_file");
  if (text.includes("\u0000") || text.includes("\uFFFD")) {
    throw new CsvInputError("invalid_encoding");
  }

  const separator = delimiter ?? detectDelimiter(text);
  const records: CsvRow[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;
  let explicitCells = false;
  let lineNumber = 1;
  let recordLine = 1;

  const pushCell = () => {
    if (cells.length >= CSV_LIMITS.columns) {
      throw new CsvInputError("too_many_columns", recordLine);
    }
    cells.push(cell);
    cell = "";
    closedQuote = false;
  };

  const pushRecord = () => {
    pushCell();
    // Only physical blank lines are ignorable; ",," is an invalid data row.
    if (explicitCells || cells.some((value) => value.trim() !== "")) {
      if (records.length >= CSV_LIMITS.rows + 1) {
        throw new CsvInputError("too_many_rows", recordLine);
      }
      records.push({ lineNumber: recordLine, cells });
    }
    cells = [];
    explicitCells = false;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else if (character === "\r" || character === "\n") {
        cell += "\n";
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        lineNumber += 1;
      } else {
        cell += character;
      }
    } else if (character === separator) {
      explicitCells = true;
      pushCell();
    } else if (character === "\r" || character === "\n") {
      pushRecord();
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      lineNumber += 1;
      recordLine = lineNumber;
    } else if (character === '"' && cell === "" && !closedQuote) {
      explicitCells = true;
      quoted = true;
    } else if (character === '"' || closedQuote) {
      // Reject malformed quoting instead of silently moving values to another column.
      throw new CsvInputError("unexpected_quote", lineNumber);
    } else {
      cell += character;
    }

    if (cell.length > CSV_LIMITS.cellCharacters) {
      throw new CsvInputError("cell_too_long", recordLine);
    }
  }

  if (quoted) throw new CsvInputError("unclosed_quote", recordLine);
  if (cell !== "" || cells.length > 0 || closedQuote) pushRecord();
  if (records.length === 0) throw new CsvInputError("empty_file");
  if (records.length === 1) throw new CsvInputError("no_data_rows");

  return {
    delimiter: separator,
    headers: records[0].cells.map((value) => value.trim()),
    rows: records.slice(1),
  };
}
