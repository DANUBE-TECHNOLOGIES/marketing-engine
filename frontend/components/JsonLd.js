import { canonicalizeJsonLd } from "../lib/seo/canonical-jsonld";

export default function JsonLd({ data }) {
  if (!data) {
    return null;
  }

  const normalized = canonicalizeJsonLd(data);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(normalized).replace(/</g, "\\u003c"),
      }}
    />
  );
}
