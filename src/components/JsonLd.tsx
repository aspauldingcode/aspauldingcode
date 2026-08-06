/** Serialize structured data for crawlers. */
export default function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be raw JSON in the document.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload.length === 1 ? payload[0] : payload).replace(
          /</g,
          '\\u003c'
        ),
      }}
    />
  );
}
