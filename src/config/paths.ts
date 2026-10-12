/** In-page link that keeps the GitHub Pages project base path. */
export function sectionHref(id: string): string {
  const hash = id.replace(/^#/, '')
  return `${import.meta.env.BASE_URL}#${hash}`
}
