"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { CsvInspection } from "@/modules/csv-import/models/api";
import type { StatementOptions, StatementReview } from "@/modules/csv-import/models/statement";
import { useCsvApi, type DelimiterChoice, type ExportFormat } from "./use-csv-api";

const PAGE_SIZE = 50;
const COLUMN_FIELDS = ["date", "description", "amount"] as const;
const INITIAL_OPTIONS: StatementOptions = {
  columns: { date: -1, description: -1, amount: -1 },
  dateFormat: "dmy",
  decimalSeparator: ",",
  currency: "COP",
};

/** Temporary native-HTML view; it sends choices to the API without normalizing data. */
export default function CsvImportClient() {
  const t = useTranslations("CsvImport");
  const api = useCsvApi();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<DelimiterChoice>("auto");
  const [inspection, setInspection] = useState<CsvInspection | null>(null);
  const [options, setOptions] = useState<StatementOptions>(INITIAL_OPTIONS);
  const [review, setReview] = useState<StatementReview | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(() => new Set());
  const [page, setPage] = useState(0);
  const [download, setDownload] = useState<{ count: number; format: ExportFormat } | null>(null);
  const busy = api.pending !== null;
  const pageCount = review ? Math.ceil(review.rows.length / PAGE_SIZE) : 0;
  const visibleRows = review?.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  const previewColumns = inspection
    ? Math.max(inspection.headers.length, ...inspection.sampleRows.map((row) => row.cells.length))
    : 0;

  function clearReview() {
    setReview(null);
    setSelectedRows(new Set());
    setPage(0);
    setDownload(null);
    api.clearError();
  }

  function clearInspection() {
    setInspection(null);
    setOptions(INITIAL_OPTIONS);
    clearReview();
  }

  function changeOptions(next: StatementOptions) {
    setOptions(next);
    clearReview();
  }

  async function inspectFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    clearInspection();
    const result = await api.inspect({ file, delimiter });
    if (result) setInspection(result);
  }

  async function loadSample() {
    if (busy) return;
    clearInspection();
    setFile(null);
    setDelimiter("auto");
    if (fileInput.current) fileInput.current.value = "";
    const result = await api.inspectSample();
    if (result) {
      setFile(result.file);
      setInspection(result.inspection);
    }
  }

  async function reviewFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !inspection || busy) return;
    clearReview();
    const result = await api.review({ file, delimiter }, options);
    if (result) {
      setReview(result);
      setSelectedRows(new Set(result.rows.filter((row) => row.transaction !== null).map((row) => row.sourceLine)));
    }
  }

  function toggleRow(line: number) {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
    setDownload(null);
  }

  async function exportRows(format: ExportFormat) {
    if (!file || !review || selectedRows.size === 0 || busy) return;
    setDownload(null);
    const blob = await api.exportSelection({ file, delimiter }, options, [...selectedRows], format);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `omnibudget-statement.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setDownload({ count: selectedRows.size, format });
  }

  function delimiterLabel(value: DelimiterChoice) {
    return t(`delimiters.${value === "auto" ? "auto" : value === "," ? "comma" : value === ";" ? "semicolon" : "tab"}`);
  }

  return (
    <>
      <p id="csv-privacy">{t("privacy")}</p>
      <p id="csv-limits">{t("limits")}</p>
      <form onSubmit={inspectFile} aria-describedby="csv-privacy csv-limits">
        <fieldset disabled={busy}>
          <legend>{t("sourceStep")}</legend>
          <p>
            <label htmlFor="csv-file">{t("fileLabel")}</label>{" "}
            <input
              ref={fileInput}
              id="csv-file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                clearInspection();
              }}
            />
          </p>
          <p>{file ? t("sourceFile", { name: file.name }) : t("noFile")}</p>
          <p>
            <label htmlFor="csv-delimiter">{t("delimiterLabel")}</label>{" "}
            <select id="csv-delimiter" value={delimiter} onChange={(event) => {
              setDelimiter(event.target.value as DelimiterChoice);
              clearInspection();
            }}>
              {(["auto", ",", ";", "\t"] as const).map((value) => (
                <option key={value} value={value}>{delimiterLabel(value)}</option>
              ))}
            </select>
          </p>
          <button type="submit" disabled={!file}>{t("inspectButton")}</button>{" "}
          <button type="button" onClick={loadSample}>{t("sampleButton")}</button>
          <p>{t("sampleDescription")}</p>
          <p><a href="/examples/csv-statement.csv" download>{t("sampleDownload")}</a></p>
        </fieldset>
      </form>

      <div role="status" aria-live="polite">
        {api.pending ? <p>{t(`progress.${api.pending}`)}</p> : null}
        {download ? <p>{t("downloadStarted", { count: download.count, format: download.format.toUpperCase() })}</p> : null}
      </div>
      {api.error ? (
        <p role="alert">
          {t.has(`errors.${api.error.code}`) ? t(`errors.${api.error.code}`) : t("errors.request_failed")}
          {api.error.lineNumber ? ` ${t("errorLine", { line: api.error.lineNumber })}` : null}
        </p>
      ) : null}

      {inspection ? (
        <section aria-labelledby="csv-mapping-heading">
          <h2 id="csv-mapping-heading">{t("mappingStep")}</h2>
          <p>{t("inspectionSummary", { rows: inspection.totalRows, delimiter: delimiterLabel(inspection.delimiter) })}</p>
          <details open>
            <summary>{t("previewSummary", { count: inspection.sampleRows.length })}</summary>
            <table>
              <caption>{t("previewCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("sourceLine")}</th>
                  {Array.from({ length: previewColumns }, (_, index) => (
                    <th scope="col" key={index}>
                      {t("columnOption", { number: index + 1, header: inspection.headers[index] || t("emptyHeader") })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspection.sampleRows.map((row) => (
                  <tr key={row.lineNumber}>
                    <th scope="row">{row.lineNumber}</th>
                    {Array.from({ length: previewColumns }, (_, index) => <td key={index}>{row.cells[index] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <form onSubmit={reviewFile}>
            <fieldset disabled={busy}>
              <legend>{t("mappingLegend")}</legend>
              <p id="csv-mapping-help">{t("mappingHelp")}</p>
              {COLUMN_FIELDS.map((field) => (
                <p key={field}>
                  <label htmlFor={`csv-column-${field}`}>{t(`fields.${field}`)}</label>{" "}
                  <select
                    id={`csv-column-${field}`}
                    required
                    aria-describedby="csv-mapping-help"
                    value={options.columns[field] < 0 ? "" : options.columns[field]}
                    onChange={(event) => changeOptions({
                      ...options,
                      columns: { ...options.columns, [field]: Number(event.target.value) },
                    })}
                  >
                    <option value="" disabled>{t("chooseColumn")}</option>
                    {inspection.headers.map((header, index) => (
                      <option value={index} key={index}>
                        {t("columnOption", { number: index + 1, header: header || t("emptyHeader") })}
                      </option>
                    ))}
                  </select>
                </p>
              ))}
              <p>
                <label htmlFor="csv-date-format">{t("dateFormatLabel")}</label>{" "}
                <select id="csv-date-format" value={options.dateFormat} onChange={(event) => changeOptions({
                  ...options, dateFormat: event.target.value as StatementOptions["dateFormat"],
                })}>
                  {(["dmy", "ymd", "mdy"] as const).map((format) => <option value={format} key={format}>{t(`dateFormats.${format}`)}</option>)}
                </select>
              </p>
              <p>
                <label htmlFor="csv-decimal">{t("decimalLabel")}</label>{" "}
                <select id="csv-decimal" value={options.decimalSeparator} onChange={(event) => changeOptions({
                  ...options, decimalSeparator: event.target.value as StatementOptions["decimalSeparator"],
                })}>
                  <option value=",">{t("decimalFormats.comma")}</option>
                  <option value=".">{t("decimalFormats.period")}</option>
                </select>
              </p>
              <p>
                <label htmlFor="csv-currency">{t("currencyLabel")}</label>{" "}
                <select id="csv-currency" value={options.currency} onChange={(event) => changeOptions({
                  ...options, currency: event.target.value as StatementOptions["currency"],
                })}>
                  {(["COP", "USD", "EUR"] as const).map((currency) => <option value={currency} key={currency}>{t(`currencies.${currency}`)}</option>)}
                </select>
              </p>
              <p>{t("formatHelp")}</p>
              <button type="submit">{t("reviewButton")}</button>
            </fieldset>
          </form>
        </section>
      ) : null}

      {review ? (
        <section aria-labelledby="csv-review-heading">
          <h2 id="csv-review-heading">{t("reviewStep")}</h2>
          <p>{t("reviewSummary", review.summary)}</p>
          <p id="csv-duplicate-help">{t("duplicateHelp")}</p>
          <p>{t("invalidHelp")}</p>
          <fieldset disabled={busy}>
            <legend>{t("selectionLegend")}</legend>
            <button type="button" onClick={() => {
              setSelectedRows(new Set(review.rows.filter((row) => row.transaction !== null).map((row) => row.sourceLine)));
              setDownload(null);
            }}>{t("selectAll")}</button>{" "}
            <button type="button" onClick={() => {
              setSelectedRows(new Set());
              setDownload(null);
            }}>{t("selectNone")}</button>
            <p role="status">{t("selectionCount", { count: selectedRows.size })}</p>
            <p>{t("minorUnitsHelp")}</p>
            <table aria-describedby="csv-duplicate-help">
              <caption>{t("reviewCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("selectHeader")}</th>
                  <th scope="col">{t("sourceLine")}</th>
                  <th scope="col">{t("rawHeader")}</th>
                  <th scope="col">{t("preparedHeader")}</th>
                  <th scope="col">{t("statusHeader")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.sourceLine}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.sourceLine)}
                        disabled={row.transaction === null}
                        aria-label={t("selectRow", { line: row.sourceLine })}
                        onChange={() => toggleRow(row.sourceLine)}
                      />
                    </td>
                    <th scope="row">{row.sourceLine}</th>
                    <td>
                      <dl>
                        <dt>{t("fields.date")}</dt><dd>{row.raw.date}</dd>
                        <dt>{t("fields.description")}</dt><dd>{row.raw.description}</dd>
                        <dt>{t("fields.amount")}</dt><dd>{row.raw.amount}</dd>
                      </dl>
                    </td>
                    <td>
                      {row.transaction ? (
                        <dl>
                          <dt>{t("normalizedDate")}</dt><dd>{row.transaction.transactionDate}</dd>
                          <dt>{t("fields.description")}</dt><dd>{row.transaction.description}</dd>
                          <dt>{t("amountMinor")}</dt><dd>{row.transaction.amountMinor}</dd>
                          <dt>{t("currencyLabel")}</dt><dd>{row.transaction.currency}</dd>
                          <dt>{t("directionLabel")}</dt><dd>{t(`directions.${row.transaction.direction}`)}</dd>
                        </dl>
                      ) : t("notPrepared")}
                    </td>
                    <td>
                      {row.issues.length > 0 ? <ul>{row.issues.map((issue) => <li key={issue}>{t(`issues.${issue}`)}</li>)}</ul> : t("validRow")}
                      {row.transaction?.duplicateFlag ? <p>{t("possibleDuplicate", { group: row.transaction.duplicateGroup ?? "" })}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <nav aria-label={t("paginationLabel")}>
              <p>{t("pageCount", { page: page + 1, pages: pageCount })}</p>
              <button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>{t("previousPage")}</button>{" "}
              <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>{t("nextPage")}</button>
            </nav>
            <p>{t("exportHelp")}</p>
            <button type="button" disabled={selectedRows.size === 0} onClick={() => exportRows("csv")}>{t("exportCsv")}</button>{" "}
            <button type="button" disabled={selectedRows.size === 0} onClick={() => exportRows("json")}>{t("exportJson")}</button>
          </fieldset>
        </section>
      ) : null}
    </>
  );
}
