"use client";

import { useEffect, useState } from "react";

export default function DataForSeoPreviewPage() {

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/dataforseo-payload-preview")
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 30 }}>
        Chargement...
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>

      <h1>Prévisualisation DataForSEO</h1>

      
      <a
        href="http://localhost:4000/dataforseo-export.csv"
        target="_blank"
        style={{
          display: "inline-block",
          padding: "12px 20px",
          background: "#111",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
          marginBottom: 30
        }}
      >
        Télécharger le CSV
      </a>


<div style={{
        background: "#f5f5f5",
        padding: 20,
        borderRadius: 10,
        marginBottom: 30
      }}>
        <p><strong>API activée :</strong> {String(data.enabled)}</p>
        <p><strong>Agences :</strong> {data.totalAgencies}</p>
        <p><strong>Tâches :</strong> {data.totalTasks}</p>
      </div>

      {data.rows.map((agency) => (

        <div
          key={agency.code}
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 20,
            marginBottom: 25
          }}
        >

          <h2>
            {agency.agencyName}
          </h2>

          <p>
            <strong>Ville :</strong> {agency.city}
          </p>

          <p>
            <strong>Monitoring :</strong> {String(agency.enabled)}
          </p>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 15
            }}
          >

            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={th}>Keyword</th>
                <th style={th}>Location</th>
                <th style={th}>Language</th>
                <th style={th}>Device</th>
              </tr>
            </thead>

            <tbody>

              {agency.payload.map((item, idx) => (
                <tr key={idx}>
                  <td style={td}>{item.keyword}</td>
                  <td style={td}>{item.location_name}</td>
                  <td style={td}>{item.language_name}</td>
                  <td style={td}>{item.device}</td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>

      ))}

    </div>
  );
}

const th = {
  border: "1px solid #ddd",
  padding: 10,
  textAlign: "left"
};

const td = {
  border: "1px solid #ddd",
  padding: 10
};
