import type { DecimalSeparator, StatementDateFormat, StatementIssue } from "../models/statement";

const MAX_MINOR_UNITS = BigInt("9223372036854775807");

export function normalizeDate(input: string, format: StatementDateFormat): string | null {
  const value = input.trim();
  const pattern = format === "ymd" ? /^(\d{4})-(\d{2})-(\d{2})$/ : /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const parts = pattern.exec(value);
  if (!parts) return null;

  const year = Number(format === "ymd" ? parts[1] : parts[3]);
  const month = Number(format === "dmy" ? parts[2] : format === "mdy" ? parts[1] : parts[2]);
  const day = Number(format === "ymd" ? parts[3] : format === "dmy" ? parts[1] : parts[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || year > 2100 || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  // A date-only ISO value never changes when the API and browser use different time zones.
  return date.toISOString().slice(0, 10);
}

type AmountResult =
  | { amountMinor: string; direction: "inflow" | "outflow"; issue?: never }
  | { issue: StatementIssue; amountMinor?: never; direction?: never };

export function normalizeAmount(input: string, decimal: DecimalSeparator): AmountResult {
  let value = input.trim();
  if (value.length > 40) return { issue: "amount_out_of_range" };
  // Parentheses are a negative sign, not a request to round or infer a currency.
  if (/^\([^+-]+\)$/.test(value)) value = "-" + value.slice(1, -1);
  const pattern = decimal === "."
    ? /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/
    : /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;
  if (!pattern.test(value)) return { issue: "invalid_amount" };

  const direction = value.startsWith("-") ? "outflow" : "inflow";
  const unsigned = value.replace(/^[+-]/, "");
  const grouping = decimal === "." ? "," : ".";
  const [whole, fraction = ""] = unsigned.replaceAll(grouping, "").split(decimal);
  // Never multiply a floating-point number by 100: parse exact decimal digits instead.
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (minor === BigInt(0)) return { issue: "zero_amount" };
  if (minor > MAX_MINOR_UNITS) return { issue: "amount_out_of_range" };
  return { amountMinor: minor.toString(), direction };
}
