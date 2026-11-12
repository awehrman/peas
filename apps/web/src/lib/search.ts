import { z } from "zod";

/**
 * Search-param schemas that never throw: a malformed URL falls back to "no filter" instead of an error page. TanStack Router parses "?page=2" as the number 2 and "?q=123" as a number too, so text params are coerced back to strings.
 *
 * @example
 * z.object({ q: optionalText, page: optionalPage }).parse({ q: 123, page: "x" }) // { q: "123", page: undefined }
 */
export const optionalText = z
  .preprocess(
    (value) =>
      value === undefined || value === null || value === ""
        ? undefined
        : String(value),
    z.string().optional()
  )
  .catch(undefined);

export const optionalPage = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .catch(undefined);

export function optionalEnum<const T extends readonly [string, ...string[]]>(
  values: T
) {
  return z.enum(values).optional().catch(undefined);
}
