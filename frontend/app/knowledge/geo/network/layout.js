export default function NetworkGeoLayout({ children }) {
  return (
    <>
      <nav
        aria-label="Navigation GEO réseau"
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          padding: "14px 32px",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
        }}
      >
        <a href="/knowledge/geo/network">Agences</a>
        <a href="/knowledge/geo/network/people">Conseillers</a>
        <a href="/knowledge/geo/network/expertise">Expertises</a>
        <a href="/knowledge/geo/network/readiness">Readiness publique</a>
      </nav>
      {children}
    </>
  );
}
