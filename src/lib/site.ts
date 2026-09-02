/**
 * Where this site lives.
 *
 * Link previews need it. A crawler that follows a shared link — WhatsApp's in
 * particular — reads the `og:` tags out of the server-rendered HTML and will
 * not resolve a relative image path, so those tags have to carry an absolute
 * URL. The published host is the default; set `VITE_SITE_URL` to point a
 * deployment somewhere else.
 */

const configured = import.meta.env.VITE_SITE_URL as string | undefined;

export const SITE_ORIGIN = (configured || "https://ligasfrancesinha.lovable.app").replace(
  /\/+$/,
  "",
);

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
