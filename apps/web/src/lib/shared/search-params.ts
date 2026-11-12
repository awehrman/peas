export type RawSearchParams = Record<string, string | string[] | undefined>;

export function getSearchParam(
  params: RawSearchParams,
  key: string
): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.trim() !== "" ? first : undefined;
}

export function getPageParam(params: RawSearchParams): number {
  const page = Number.parseInt(getSearchParam(params, "page") ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function getEnumParam<const T extends readonly string[]>(
  params: RawSearchParams,
  key: string,
  options: T
): T[number] | undefined {
  const value = getSearchParam(params, key);
  return options.find((option) => option === value);
}
