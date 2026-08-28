import { CSV_DELIMITERS, CSV_LIMITS, CsvInputError, type CsvDelimiter } from "../models/csv-document";
import { parseCsv } from "../services/parse-csv";

const MAX_REQUEST_BYTES = CSV_LIMITS.fileBytes + 64 * 1024;

export class CsvRequestError extends Error {
  constructor(public readonly code: string, public readonly status = 400) {
    super(code);
    this.name = "CsvRequestError";
  }
}

async function readBoundedFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new CsvRequestError("multipart_required", 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_REQUEST_BYTES) throw new CsvRequestError("request_too_large", 413);
  if (!request.body) throw new CsvRequestError("invalid_request");

  // Count actual stream bytes as well: a client can omit or falsify Content-Length.
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new CsvRequestError("request_too_large", 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return await new Response(bytes, { headers: { "content-type": contentType } }).formData();
  } catch {
    throw new CsvRequestError("invalid_request");
  }
}

export async function readSubmission(request: Request) {
  const form = await readBoundedFormData(request);
  const allowed = new Set(["file", "delimiter", "options", "selectedRows", "format"]);
  for (const key of form.keys()) {
    if (!allowed.has(key) || form.getAll(key).length !== 1) {
      throw new CsvRequestError("invalid_request");
    }
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new CsvRequestError("file_required");
  if (!file.name.toLowerCase().endsWith(".csv")) throw new CsvRequestError("unsupported_file", 415);
  if (file.size > CSV_LIMITS.fileBytes) throw new CsvRequestError("file_too_large", 413);

  const delimiter = form.get("delimiter");
  if (delimiter !== null && delimiter !== "auto" && !CSV_DELIMITERS.includes(delimiter as CsvDelimiter)) {
    throw new CsvRequestError("invalid_delimiter");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new CsvInputError("invalid_encoding");
  }
  return {
    form,
    document: parseCsv(text, delimiter === null || delimiter === "auto" ? undefined : delimiter as CsvDelimiter),
  };
}

export function readJsonField(form: FormData, name: string, errorCode: string): unknown {
  const value = form.get(name);
  if (typeof value !== "string") throw new CsvRequestError(errorCode);
  try {
    return JSON.parse(value);
  } catch {
    throw new CsvRequestError(errorCode);
  }
}
