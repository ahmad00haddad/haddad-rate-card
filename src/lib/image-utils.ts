export function getCleanImageUrl(url: string | null): string | null {
  if (!url) return null;
  let clean = url;
  if (clean.includes('/cdn-cgi/image/')) {
    const parts = clean.split('/https://');
    if (parts.length > 1) clean = 'https://' + parts[1];
  }
  return clean.replace('www.bhphotovideo.com', 'static.bhphoto.com');
}
