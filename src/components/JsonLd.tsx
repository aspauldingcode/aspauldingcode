/** Serialize structured data for crawlers. Always a single object with @context. */
export default function JsonLd({ data }: { data: object | object[] }) {
  const items = (Array.isArray(data) ? data : [data]).filter(
    (item): item is object => Boolean(item) && typeof item === 'object'
  );

  const body =
    items.length === 1
      ? items[0]
      : {
          '@context': 'https://schema.org',
          '@graph': items.map((item) => {
            const rec = item as Record<string, unknown>;
            if (!('@context' in rec)) return item;
            const { '@context': _ctx, ...rest } = rec;
            return rest;
          }),
        };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(body).replace(/</g, '\\u003c'),
      }}
    />
  );
}
