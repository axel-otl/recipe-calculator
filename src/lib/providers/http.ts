import type { PriceUnit } from "../types";

/** Shared HTTP and parsing helpers for store providers. */

const REQUEST_TIMEOUT_MS = 15_000;

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "Accept-Language": "sv-SE,sv;q=0.9",
};

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
}

async function request(url: string, accept: string, options: RequestOptions): Promise<Response> {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      ...BROWSER_HEADERS,
      Accept: accept,
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  // ICA's AWS WAF answers rate-limited or suspected bot traffic with an empty 202.
  if (response.headers.get("x-amzn-waf-action") || (response.status === 202 && accept.includes("json"))) {
    throw new HttpError("blocked by the site's bot protection – try again in a few minutes", 429);
  }
  if (!response.ok) throw new HttpError(`${new URL(url).host} responded ${response.status}`, response.status);
  return response;
}

export async function fetchJson(url: string, options: RequestOptions = {}): Promise<unknown> {
  return (await request(url, "application/json", options)).json();
}

export async function fetchText(url: string, options: RequestOptions = {}): Promise<string> {
  return (await request(url, "text/html,application/xhtml+xml", options)).text();
}

export type Json = Record<string, unknown>;

export const asObject = (value: unknown): Json | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : undefined;

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : typeof value === "number" ? String(value) : undefined;

/** Parses numbers like 49.9, "49,90", "49:90", "49,90 kr" or { value: 49.9 }. */
export function parsePrice(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const object = asObject(value);
  if (object) return parsePrice(object.value ?? object.amount ?? object.b2cPrice ?? object.formattedValue);
  if (typeof value !== "string") return undefined;
  const match = value.replace(/\s/g, "").match(/(\d+(?:[.,:]\d+)?)/);
  return match ? parseFloat(match[1].replace(/[,:]/, ".")) : undefined;
}

export function parseUnit(value: unknown): PriceUnit | undefined {
  const text = asString(value)?.toLowerCase();
  if (!text) return undefined;
  if (/\bkg\b|kilo/.test(text)) return "kg";
  if (/\bl\b|liter|litre/.test(text)) return "l";
  if (/\bst\b|styck|\bp\b|förp/.test(text)) return "st";
  return undefined;
}

export function parseDate(value: unknown): string | undefined {
  if (typeof value === "number") return new Date(value).toISOString().slice(0, 10);
  const text = asString(value);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

/**
 * Small in-memory cache, so a page full of stores doesn't hit the chains'
 * servers again for every request. Failed lookups aren't cached.
 */
const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { expires: now + ttlMs, value });
  value.catch(() => cache.delete(key));
  return value;
}
