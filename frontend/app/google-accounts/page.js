import MainLayout from "../components/MainLayout";

async function getAccounts() {
  const res = await fetch("http://backend:4000/google/accounts", {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error("Erreur chargement comptes Google");
  }

  return res.json();
}

export default async function GoogleAccountsPage() {
  const data = await getAccounts();

  return (
    <MainLayout
      title="Comptes Google Business"
      subtitle="Comptes Google Business Profile accessibles via l’API."
    >
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="font-bold text-lg mb-4">
          {data.accounts?.length || 0} compte(s) détecté(s)
        </div>

        <div className="space-y-4">
          {(data.accounts || []).map((account) => (
            <div key={account.name} className="border rounded-xl p-4">
              <div className="font-bold">{account.accountName}</div>
              <div className="text-sm text-gray-500">{account.name}</div>
              <div className="text-sm mt-2">Type : {account.type}</div>
              <div className="text-sm">Vérification : {account.verificationState}</div>
              <div className="text-sm">Vetted : {account.vettedState}</div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
