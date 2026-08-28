"use client";

import { useEffect, useRef, useState } from "react";
import type { CsvErrorResponse, CsvInspection } from "@/modules/csv-import/models/api";
import type { CsvDelimiter } from "@/modules/csv-import/models/csv-document";
import type { StatementOptions, StatementReview } from "@/modules/csv-import/models/statement";

export type DelimiterChoice = CsvDelimiter | "auto";
export type ExportFormat = "csv" | "json";
type RequestStage = "inspect" | "sample" | "review" | "export";
type RequestError = CsvErrorResponse["error"];
type CsvSource = { file: File; delimiter: DelimiterChoice };

class CsvRequestError extends Error {
  constructor(readonly details: RequestError) {
    super(details.code);
  }
}

async function requireSuccess(response: Response): Promise<void> {
  if (response.ok) return;

  const payload: unknown = await response.json().catch(() => null);
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = payload.error;
    if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
      const lineNumber = "lineNumber" in error ? error.lineNumber : undefined;
      throw new CsvRequestError({
        code: error.code,
        ...(typeof lineNumber === "number" && Number.isSafeInteger(lineNumber) && lineNumber > 0
          ? { lineNumber }
          : {}),
      });
    }
  }

  throw new CsvRequestError({ code: "request_failed" });
}

async function postCsv(
  endpoint: "inspect" | "review" | "export",
  source: CsvSource,
  signal: AbortSignal,
  fields: Record<string, string> = {},
): Promise<Response> {
  const body = new FormData();
  body.set("file", source.file);
  body.set("delimiter", source.delimiter);
  for (const [key, value] of Object.entries(fields)) body.set(key, value);

  const response = await fetch(`/api/csv-import/${endpoint}`, {
    method: "POST",
    body,
    signal,
    cache: "no-store",
    credentials: "omit",
  });
  await requireSuccess(response);
  return response;
}

/** Transport and request state only. The API owns all statement processing. */
export function useCsvApi() {
  const [pending, setPending] = useState<RequestStage | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function run<T>(stage: RequestStage, action: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    // A synchronous lock also prevents two clicks before React updates the controls.
    if (activeRequest.current) return null;
    const request = new AbortController();
    activeRequest.current = request;
    setPending(stage);
    setError(null);

    try {
      return await action(request.signal);
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(cause instanceof CsvRequestError
          ? cause.details
          : { code: cause instanceof TypeError ? "network_error" : "request_failed" });
      }
      return null;
    } finally {
      if (activeRequest.current === request) {
        activeRequest.current = null;
        if (!request.signal.aborted) setPending(null);
      }
    }
  }

  return {
    pending,
    error,
    clearError: () => setError(null),
    inspect: (source: CsvSource) => run<CsvInspection>("inspect", async (signal) => {
      const response = await postCsv("inspect", source, signal);
      return response.json();
    }),
    inspectSample: () => run<{ file: File; inspection: CsvInspection }>("sample", async (signal) => {
      const sample = await fetch("/examples/csv-statement.csv", { signal, cache: "no-store", credentials: "omit" });
      await requireSuccess(sample);
      const file = new File([await sample.blob()], "csv-statement.csv", { type: "text/csv" });
      const response = await postCsv("inspect", { file, delimiter: "auto" }, signal);
      return { file, inspection: await response.json() };
    }),
    review: (source: CsvSource, options: StatementOptions) => run<StatementReview>("review", async (signal) => {
      const response = await postCsv("review", source, signal, { options: JSON.stringify(options) });
      return response.json();
    }),
    exportSelection: (source: CsvSource, options: StatementOptions, selectedRows: number[], format: ExportFormat) =>
      run<Blob>("export", async (signal) => {
        const response = await postCsv("export", source, signal, {
          options: JSON.stringify(options),
          selectedRows: JSON.stringify(selectedRows),
          format,
        });
        return response.blob();
      }),
  };
}
