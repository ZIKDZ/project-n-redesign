/**
 * Resolves a public-folder asset path correctly in both dev and production.
 *
 * Dev  (base = "/")         → "/images/logo.svg"
 * Prod (base = "/static/")  → "/static/images/logo.svg"
 *
 * Usage:  src={asset("images/logo.svg")}
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL // always has a trailing slash
  return `${base}${path.replace(/^\//, '')}`
}
