export default function PublicBrandLegalRuntime({
  runtime,
  children,
}) {
  const variables =
    runtime?.runtime?.brand?.cssVariables &&
    typeof runtime.runtime.brand.cssVariables === "object"
      ? runtime.runtime.brand.cssVariables
      : {};

  const bodyFont = variables["--brand-body-font"];
  const background = variables["--brand-background"];
  const textColor = variables["--brand-text"];

  return (
    <div
      data-public-brand-runtime="1"
      data-brand-profile={
        runtime?.runtime?.brand?.overrideProfileId ||
        runtime?.runtime?.brand?.sharedProfileId ||
        ""
      }
      style={{
        ...variables,
        backgroundColor: background || undefined,
        color: textColor || undefined,
        fontFamily: bodyFont || undefined,
        minHeight: "100%",
      }}
    >
      {children}
    </div>
  );
}
