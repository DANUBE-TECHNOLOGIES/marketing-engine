async function getKeywords() {
  const res = await fetch("http://backend:4000/seo/keywords", {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("Erreur chargement keywords");
  }

  return res.json();
}

export default async function SeoKeywordsDbPage() {
  const data = await getKeywords();

  return (
    <main style={{ padding: 30 }}>
      <h1>Keywords SEO Local Engine</h1>

      <p>Total mots-clés : {data.total}</p>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Agence</th>
            <th>Ville</th>
            <th>Mot clé</th>
            <th>Localisation</th>
            <th>Activé</th>
          </tr>
        </thead>

        <tbody>
          {data.rows.map((row, index) => (
            <tr key={index}>
              <td>{row.agency_code}</td>
              <td>{row.city}</td>
              <td>{row.keyword}</td>
              <td>{row.location_name}</td>
              <td>{String(row.enabled)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
