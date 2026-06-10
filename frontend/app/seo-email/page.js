import MainLayout from "../components/MainLayout";
import SeoEmailButtons from "./SeoEmailButtons";

async function getPreview() {
  try {
    const res = await fetch("http://backend:4000/seo-email/preview", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      ok: false,
      subject: "",
      to: "",
      text: "",
      html: ""
    };
  }
}

export default async function Page() {
  const preview = await getPreview();

  return (
    <MainLayout
      title="Email SEO quotidien"
      subtitle="Prévisualisation et envoi du rapport quotidien Mondescale"
    >
      <SeoEmailButtons />

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Paramètres</h2>
        <div className="text-sm text-gray-600">Objet : {preview.subject || "-"}</div>
        <div className="text-sm text-gray-600">Destinataires : {preview.to || "SMTP non configuré"}</div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Texte du rapport</h2>
        <pre className="bg-slate-50 rounded-xl p-4 whitespace-pre-wrap text-sm">
          {preview.text || "Aucun rapport disponible."}
        </pre>
      </div>
    </MainLayout>
  );
}
