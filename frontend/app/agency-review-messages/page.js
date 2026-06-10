import { requireRole } from "../lib/access";
import PageHeader from "../components/PageHeader";
import ButtonLink from "../components/ButtonLink";
import CopyButton from "../components/CopyButton";

async function getMessages() {
  const res = await fetch("http://backend:4000/agency-directory-review-messages", {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("Erreur messages avis");

  return res.json();
}

export default async function AgencyReviewMessagesPage() {
  await requireRole(["admin", "manager"]);

  const data = await getMessages();

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-gray-900">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Messages avis par agence"
          subtitle="Messages prêts à copier utilisant le référentiel agences centralisé."
          action={
            <div className="flex gap-2">
              <ButtonLink href="/agency-directory">Référentiel agences</ButtonLink>
              <ButtonLink href="/review-requests">Demandes d’avis</ButtonLink>
              <ButtonLink href="/admin-network">Admin réseau</ButtonLink>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.messages.map((item) => (
            <div key={item.code} className="bg-white rounded-xl shadow p-5 border">
              <div className="font-bold text-lg">{item.agencyName}</div>
              <div className="text-sm text-gray-500 mb-4">{item.city} · {item.phone}</div>

              <div className="space-y-4">
                <div className="bg-gray-100 rounded-xl p-4">
                  <div className="font-semibold mb-2">SMS</div>
                  <div className="text-sm">{item.sms}</div>
                  <div className="mt-3"><CopyButton text={item.sms} /></div>
                </div>

                <div className="bg-gray-100 rounded-xl p-4">
                  <div className="font-semibold mb-2">WhatsApp</div>
                  <div className="text-sm whitespace-pre-line">{item.whatsapp}</div>
                  <div className="mt-3"><CopyButton text={item.whatsapp} /></div>
                </div>

                <div className="bg-gray-100 rounded-xl p-4">
                  <div className="font-semibold mb-2">Email</div>
                  <div className="text-sm font-medium mb-2">{item.emailSubject}</div>
                  <div className="text-sm whitespace-pre-line">{item.emailBody}</div>
                  <div className="mt-3">
                    <CopyButton text={`Objet : ${item.emailSubject}\n\n${item.emailBody}`} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
