async function getKeywords() {
  const res = await fetch(
    "http://backend:4000/seo/keywords",
    { cache: "no-store" }
  );

  if (!res.ok)
    throw new Error("Erreur chargement keywords");

  return res.json();
}

export default async function Page() {
  const data = await getKeywords();

  return (
    <div style={{padding:"30px"}}>
      <h1>Keywords SEO Local Engine</h1>

      <p>
        Total mots-clés : {data.total}
      </p>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Agence</th>
            <th>Ville</th>
            <th>Mot clé</th>
            <th>Activé</th>
          </tr>
        </thead>

        <tbody>
          {data.rows.map((r:any,i:number)=>(
            <tr key={i}>
              <td>{r.agency_code}</td>
              <td>{r.city}</td>
              <td>{r.keyword}</td>
              <td>{String(r.enabled)}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}
