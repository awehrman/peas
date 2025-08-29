export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return "0%";
  const percentage = (value / total) * 100;
  return `${Math.round(percentage)}%`;
}

export function formatFileSize(bytes: number): string {
  return formatBytes(bytes);
}

export function formatProgress(current: number, total: number): string {
  return `${current}/${total} (${formatPercentage(current, total)})`;
}
