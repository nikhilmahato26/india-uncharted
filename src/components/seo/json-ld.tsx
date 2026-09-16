/**
 * Renders one JSON-LD graph. `<` is escaped so no string in the data can close
 * the script element — this also covers admin-authored custom JSON-LD.
 */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
