const ALLOWED_PROTOCOLS =
  /^(https?:|mailto:|tel:)/i;

function decodeEntities(value = "") {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/");
}

function stripTags(value = "") {
  return decodeEntities(
    String(value)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function safeHref(value = "") {
  const href =
    decodeEntities(String(value)).trim();

  if (!href) {
    return null;
  }

  if (
    href.startsWith("/") &&
    !href.startsWith("//")
  ) {
    return href;
  }

  if (
    href.startsWith("#") ||
    ALLOWED_PROTOCOLS.test(href)
  ) {
    return href;
  }

  return null;
}

function paragraphFragments(html = "") {
  const source = String(html || "");

  const matches = [
    ...source.matchAll(
      /<p\b[^>]*>([\s\S]*?)<\/p>/gi
    ),
  ];

  const paragraphs =
    matches.length
      ? matches.map((match) => match[1])
      : [source];

  return paragraphs
    .map((paragraph) => {
      const fragments = [];
      let cursor = 0;

      const anchorPattern =
        /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

      for (
        const match
        of paragraph.matchAll(anchorPattern)
      ) {
        const index = match.index ?? 0;

        const before = stripTags(
          paragraph.slice(cursor, index)
        );

        if (before) {
          fragments.push({
            type: "text",
            text: before,
          });
        }

        const attributes = match[1] || "";
        const label = stripTags(match[2] || "");

        const hrefMatch =
          attributes.match(
            /\bhref\s*=\s*(["'])(.*?)\1/i
          );

        const href =
          safeHref(
            hrefMatch?.[2] || ""
          );

        if (label) {
          if (href) {
            fragments.push({
              type: "link",
              text: label,
              href,
            });
          } else {
            fragments.push({
              type: "text",
              text: label,
            });
          }
        }

        cursor =
          index + match[0].length;
      }

      const after = stripTags(
        paragraph.slice(cursor)
      );

      if (after) {
        fragments.push({
          type: "text",
          text: after,
        });
      }

      return fragments;
    })
    .filter((fragments) =>
      fragments.length > 0
    );
}

module.exports = {
  paragraphFragments,
  safeHref,
  stripTags,
};
