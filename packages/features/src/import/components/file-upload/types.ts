// Helper function to safely check if an object has a property of a specific type
function hasProperty<K extends string, T>(
  obj: unknown,
  key: K,
  type: string
): obj is Record<K, T> {
  return (
    obj !== null &&
    typeof obj === "object" &&
    key in obj &&
    typeof (obj as Record<K, unknown>)[key] === type
  );
}

// Type guard to check if a file has webkit directory properties
export function isWebkitFile(
  file: File
): file is File & { webkitRelativePath: string } {
  return hasProperty(file, "webkitRelativePath", "string");
}

// Type guard to check if a file came from a directory upload
export function isFromDirectory(file: File): boolean {
  if (!isWebkitFile(file)) return false;
  return Boolean(
    file.webkitRelativePath && file.webkitRelativePath.includes("/")
  );
}

// Interface for directory upload information
export interface DirectoryUploadInfo {
  fileIndex: number;
  webkitRelativePath: string;
  originalName: string;
}
