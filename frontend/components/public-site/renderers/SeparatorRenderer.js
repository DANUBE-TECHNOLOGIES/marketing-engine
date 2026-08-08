import {
  getSectionContent,
} from "./helpers";

export default function SeparatorRenderer({
  section,
}) {
  const content =
    getSectionContent(section);

  const size =
    ["small", "medium", "large"].includes(
      content.size
    )
      ? content.size
      : "medium";

  const spacing = {
    small: "1rem",
    medium: "2rem",
    large: "3.5rem",
  }[size];

  return (
    <div
      aria-hidden="true"
      style={{
        paddingBlock: spacing,
      }}
    >
      {content.line ? (
        <div className="public-site-container">
          <hr />
        </div>
      ) : null}
    </div>
  );
}
