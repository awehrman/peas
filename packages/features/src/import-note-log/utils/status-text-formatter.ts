export function formatStatusText(status: string): string {
  // Convert status to display-friendly text
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
