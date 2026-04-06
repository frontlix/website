/**
 * Genereert een URL-veilige slug van een string.
 * Lowercase, spaties → hyphens, alleen [a-z0-9-], max 100 chars.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accenten verwijderen
    .replace(/[^a-z0-9\s-]/g, '')    // speciale tekens verwijderen
    .replace(/\s+/g, '-')            // spaties → hyphens
    .replace(/-+/g, '-')             // dubbele hyphens samenvoegen
    .replace(/^-|-$/g, '')           // hyphens aan begin/einde verwijderen
    .slice(0, 100)
}
