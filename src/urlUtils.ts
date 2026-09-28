/**
 * Normalizes user-pasted image URLs (e.g., ibb.co viewer page vs direct image, Google Drive, Dropbox, Imgur)
 */
export function normalizeImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // If user pasted ibb.co viewer link like https://ibb.co.com/xyz or https://ibb.co/xyz
  // usually direct image link is https://i.ibb.co.com/... or https://i.ibb.co/...
  // Also clean any surrounding quotes or spaces
  url = url.replace(/^["']|["']$/g, '');

  return url;
}
