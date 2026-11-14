import type { UrlCheckOutcome } from "@peas/database";
import * as cheerio from "cheerio";
import ipaddr from "ipaddr.js";
import { type LookupAddress, lookup as dnsLookup } from "node:dns";
import { Agent, type Dispatcher, request } from "undici";

/** Bounds for one reachability check. */
export const URL_CHECK_LIMITS = {
  /** Whole check, every redirect included. */
  timeoutMs: 10_000,
  connectTimeoutMs: 5_000,
  maxRedirects: 5,
  /** A GET reads at most this much, looking for <link rel="canonical">, then aborts. */
  maxBodyBytes: 64 * 1024,
  allowedPorts: [80, 443] as readonly number[],
};

export const URL_CHECK_USER_AGENT =
  process.env.URL_CHECK_USER_AGENT ?? "PeasSourceChecker/1.0 (+recipe source verification)";

/** A target the checker refuses to contact (private network, metadata service, unsupported scheme or port). */
export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp"];

/**
 * True only for globally routable unicast addresses. Loopback, RFC 1918, link-local (including 169.254.169.254), CGNAT, multicast, unique-local IPv6, and IPv4-mapped forms of any of these are refused.
 *
 * @example
 * isPublicAddress("93.184.216.34")    // true
 * isPublicAddress("169.254.169.254")  // false
 * isPublicAddress("::ffff:127.0.0.1") // false
 */
export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  let parsed = ipaddr.parse(address);
  if (parsed.kind() === "ipv6") {
    const ipv6 = parsed as ipaddr.IPv6;
    if (ipv6.isIPv4MappedAddress()) parsed = ipv6.toIPv4Address();
  }
  return parsed.range() === "unicast";
}

/**
 * Rejects URLs the checker must never contact before any connection is made: non-http(s) schemes, credentials, ports other than 80 and 443, local hostnames, and IP literals outside public unicast space. Hostnames are checked again at connect time by `safeLookup`.
 *
 * @example
 * assertSafeTarget(new URL("http://127.0.0.1/admin")) // throws UnsafeUrlError
 */
export function assertSafeTarget(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`Scheme ${url.protocol} is not allowed`);
  }
  if (url.username || url.password) throw new UnsafeUrlError("URLs with credentials are not checked");
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!URL_CHECK_LIMITS.allowedPorts.includes(port)) {
    throw new UnsafeUrlError(`Port ${port} is not allowed`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  /* istanbul ignore next -- @preserve: http(s) URLs always parse with a host */
  if (!host) throw new UnsafeUrlError("Missing host");
  if (ipaddr.isValid(host)) {
    if (!isPublicAddress(host)) throw new UnsafeUrlError(`Address ${host} is not public`);
    return;
  }
  if (host === "localhost" || !host.includes(".") || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new UnsafeUrlError(`Host ${host} is not public`);
  }
}

type LookupCallback = (
  error: Error | null,
  address: string | LookupAddress[],
  family?: number
) => void;

/**
 * DNS lookup used for every connection: resolves all addresses and refuses the connection when any of them is not public, so a hostname cannot point the checker at an internal service (including after a redirect or a DNS rebind).
 */
export function safeLookup(
  hostname: string,
  options: { all?: boolean; family?: number | string } | number | undefined,
  callback: LookupCallback
): void {
  const opts = typeof options === "object" && options !== null ? options : {};
  const family = typeof opts.family === "number" ? opts.family : 0;
  dnsLookup(hostname, { all: true, family }, (error, addresses) => {
    if (error) return callback(error, []);
    const list = addresses as LookupAddress[];
    if (list.length === 0) return callback(new UnsafeUrlError(`${hostname} did not resolve`), []);
    const unsafe = list.find((entry) => !isPublicAddress(entry.address));
    if (unsafe) {
      return callback(new UnsafeUrlError(`${hostname} resolves to non-public ${unsafe.address}`), []);
    }
    if (opts.all) return callback(null, list);
    const first = list[0] as LookupAddress;
    callback(null, first.address, first.family);
  });
}

let sharedAgent: Agent | null = null;

/** The connection pool for URL checks, with the safe lookup and short timeouts. */
export function getUrlCheckAgent(): Agent {
  sharedAgent ??= new Agent({
    connect: {
      lookup: safeLookup as never,
      timeout: URL_CHECK_LIMITS.connectTimeoutMs,
    },
    headersTimeout: URL_CHECK_LIMITS.timeoutMs,
    bodyTimeout: URL_CHECK_LIMITS.timeoutMs,
    connections: 4,
  });
  return sharedAgent;
}

function isUnsafe(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (current instanceof UnsafeUrlError) return true;
    if (current instanceof Error && current.name === "UnsafeUrlError") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    const code = (error as { code?: string }).code ?? (cause as { code?: string } | undefined)?.code;
    if (error.name === "TimeoutError" || error.name === "AbortError") return "Timed out";
    return code ? `${error.message} (${code})` : error.message;
  }
  return String(error);
}

async function readLimited(body: Dispatcher.ResponseData["body"], limit: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      chunks.push(buffer);
      size += buffer.length;
      if (size >= limit) break;
    }
  } finally {
    body.destroy();
  }
  return Buffer.concat(chunks).subarray(0, limit).toString("utf8");
}

/**
 * The canonical URL a page declares in its head, resolved against the page URL; only http(s) results are kept.
 *
 * @example
 * extractCanonicalUrl('<link rel="canonical" href="/recipes/chili">', "https://example.com/chili?ref=x") // "https://example.com/recipes/chili"
 */
export function extractCanonicalUrl(html: string, pageUrl: string): string | null {
  const href = cheerio.load(html)('link[rel~="canonical"]').attr("href");
  if (!href) return null;
  try {
    const resolved = new URL(href, pageUrl);
    return resolved.protocol === "http:" || resolved.protocol === "https:" ? resolved.href : null;
  } catch {
    return null;
  }
}

const HEAD_FALLBACK_STATUSES = new Set([400, 403, 405, 501]);

/**
 * Checks whether a URL still answers: HEAD first, GET when the server rejects HEAD or the HEAD request fails. Redirects are followed by hand (at most five), and every hop is validated again. Only a 2xx after permitted redirects counts as REACHABLE; refused targets are BLOCKED; anything else is UNREACHABLE with the reason. A REACHABLE result says the page answers, not that it still holds the recipe.
 *
 * @example
 * await checkUrl("https://example.com/chili") // { status: "REACHABLE", httpStatus: 200, finalUrl: "https://example.com/chili", canonicalUrl: null, failureReason: null }
 */
export async function checkUrl(
  url: string,
  dispatcher: Dispatcher = getUrlCheckAgent()
): Promise<UrlCheckOutcome> {
  const signal = AbortSignal.timeout(URL_CHECK_LIMITS.timeoutMs);
  let current: URL;
  try {
    current = new URL(url);
  } catch {
    return { status: "UNREACHABLE", httpStatus: null, finalUrl: null, canonicalUrl: null, failureReason: "Not a valid URL" };
  }

  let method: "HEAD" | "GET" = "HEAD";
  let redirects = 0;
  let lastStatus: number | null = null;

  for (;;) {
    try {
      assertSafeTarget(current);
    } catch (error) {
      return { status: "BLOCKED", httpStatus: lastStatus, finalUrl: current.href, canonicalUrl: null, failureReason: describe(error) };
    }

    let response: Dispatcher.ResponseData;
    try {
      response = await request(current, {
        method,
        dispatcher,
        signal,
        headers: {
          "user-agent": URL_CHECK_USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        },
      });
    } catch (error) {
      if (isUnsafe(error)) {
        return { status: "BLOCKED", httpStatus: lastStatus, finalUrl: current.href, canonicalUrl: null, failureReason: describe(error) };
      }
      if (method === "HEAD" && !signal.aborted) {
        method = "GET";
        continue;
      }
      return { status: "UNREACHABLE", httpStatus: lastStatus, finalUrl: current.href, canonicalUrl: null, failureReason: describe(error) };
    }

    const status = response.statusCode;
    lastStatus = status;
    const location = response.headers.location;

    if (status >= 300 && status < 400 && location) {
      await response.body.dump();
      redirects++;
      if (redirects > URL_CHECK_LIMITS.maxRedirects) {
        return { status: "UNREACHABLE", httpStatus: status, finalUrl: current.href, canonicalUrl: null, failureReason: "Too many redirects" };
      }
      try {
        current = new URL(Array.isArray(location) ? (location[0] as string) : location, current);
      } catch {
        return { status: "UNREACHABLE", httpStatus: status, finalUrl: current.href, canonicalUrl: null, failureReason: "Invalid redirect" };
      }
      continue;
    }

    if (method === "HEAD" && HEAD_FALLBACK_STATUSES.has(status)) {
      await response.body.dump();
      method = "GET";
      continue;
    }

    if (status >= 200 && status < 300) {
      let canonicalUrl: string | null = null;
      if (method === "GET") {
        const contentType = String(response.headers["content-type"] ?? "");
        if (contentType.includes("html")) {
          const html = await readLimited(response.body, URL_CHECK_LIMITS.maxBodyBytes);
          canonicalUrl = extractCanonicalUrl(html, current.href);
        } else {
          response.body.destroy();
        }
      } else {
        await response.body.dump();
      }
      return { status: "REACHABLE", httpStatus: status, finalUrl: current.href, canonicalUrl, failureReason: null };
    }

    await response.body.dump();
    return { status: "UNREACHABLE", httpStatus: status, finalUrl: current.href, canonicalUrl: null, failureReason: `HTTP ${status}` };
  }
}
