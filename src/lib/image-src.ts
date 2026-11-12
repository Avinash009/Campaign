/** Stored upload URLs are absolute (APP_URL + /uploads/…). Use a same-origin
 * path so `next/image` and `<img>` work without remote-host configuration. */
export function publicImageSrc(url: string): string {
  const marker = "/uploads/"
  const index = url.indexOf(marker)
  return index === -1 ? url : url.slice(index)
}
