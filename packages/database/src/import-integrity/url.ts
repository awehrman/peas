/** Query parameters that only track a visit. Anything else may select content, so it stays. */
const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "_ga",
  "_gl",
  "yclid",
]);

function isTrackingParameter(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.startsWith("utm_") || TRACKING_PARAMETERS.has(lower);
}

/**
 * Parses a source string as an http(s) URL. Other schemes (mailto:, evernote:, file:) and plain text return null.
 *
 * @example
 * parseHttpUrl("https://example.com/a") // URL { ... }
 * parseHttpUrl("The Joy of Cooking")    // null
 */
export function parseHttpUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Conservative URL identity. Lowercases the scheme and host (the URL parser already does), drops default ports, the fragment, and known tracking parameters, and turns an empty path into "/". The scheme, "www.", trailing slashes, and the order of the remaining parameters are left alone, because any of them can change what the server returns. Returns null for anything that is not an http(s) URL.
 *
 * @example
 * normalizeUrl("HTTPS://Example.com:443/Recipe/?utm_source=x&id=4#comments") // "https://example.com/Recipe/?id=4"
 * normalizeUrl("http://example.com")                                         // "http://example.com/"
 */
export function normalizeUrl(value: string): string | null {
  const url = parseHttpUrl(value);
  if (!url) return null;

  url.hash = "";
  url.username = "";
  url.password = "";

  // Filter the raw pairs so the kept parameters keep their original encoding
  const kept = url.search
    .slice(1)
    .split("&")
    .filter((pair) => {
      if (!pair) return false;
      const rawName = pair.split("=")[0] ?? "";
      let name = rawName;
      try {
        name = decodeURIComponent(rawName.replace(/\+/g, " "));
      } catch {
        // keep the raw name
      }
      return !isTrackingParameter(name);
    });
  url.search = kept.length ? `?${kept.join("&")}` : "";

  // URL drops default ports itself; the host is lowercased by the parser
  return url.toString();
}

/**
 * The registrable-looking host without "www.", used to group URLs by website.
 *
 * @example
 * websiteDomain("https://www.seriouseats.com/x") // "seriouseats.com"
 */
export function websiteDomain(value: string): string | null {
  const url = parseHttpUrl(value);
  return url ? url.hostname.replace(/^www\./, "") : null;
}
