export const SEGMENT_TYPE_STYLES: Record<string, string> = {
  amount: "text-blue-700",
  quantity: "text-blue-700",
  unit: "text-indigo-700",
  descriptor: "italic text-amber-800",
  ingredient: "font-semibold text-greyscale-900",
  comment: "text-greyscale-500",
  separator: "text-greyscale-400",
};

export const SEGMENT_TYPE_LABELS: Record<string, string> = {
  amount: "Amount",
  quantity: "Quantity",
  unit: "Unit",
  descriptor: "Descriptor",
  ingredient: "Ingredient",
  comment: "Comment",
  separator: "Separator",
};

export const KNOWN_SEGMENT_TYPES = Object.keys(SEGMENT_TYPE_LABELS);

export function getSegmentClassName(type: string): string {
  return SEGMENT_TYPE_STYLES[type.toLowerCase()] ?? "text-greyscale-700";
}
