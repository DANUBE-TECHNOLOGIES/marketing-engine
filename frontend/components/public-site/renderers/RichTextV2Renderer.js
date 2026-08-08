import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function textParagraphs(value) {
  return String(value || "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAlignment(value) {
  return ["left", "center", "right"].includes(value)
    ? value
    : "left";
}

export default function RichTextV2Renderer({ section }) {
  const content = getSectionContent(section);
  const alignment = normalizeAlignment(content.alignment);
  const paragraphs = textParagraphs(content.html);

  return (
    <section className="public-site-section public-site-rich-text">
      <div
        className="public-site-container public-site-prose"
        style={{ textAlign: alignment }}
      >
        {getSectionTitle(section, null) ? (
          <h2
            style={
              alignment === "left"
                ? undefined
                : { marginInline: alignment === "center" ? "auto" : "0 0 22px auto" }
            }
          >
            {getSectionTitle(section, null)}
          </h2>
        ) : null}

        {content.text ? <p>{content.text}</p> : null}
        {content.description ? <p>{content.description}</p> : null}

        {paragraphs.map((paragraph, index) => (
          <p key={`paragraph-${index}`}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
