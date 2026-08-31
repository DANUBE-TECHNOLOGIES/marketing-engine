import MainLayout from "../components/MainLayout";
import LeadBackoffice from "./LeadBackoffice";

export const metadata = {
  title: "Demandes clients | Marketing Engine",
  robots: { index: false, follow: false },
};

export default function LeadsPage() {
  return (
    <MainLayout
      title="Demandes clients"
      subtitle="Suivi des demandes reçues depuis les mini-sites, sans dépendance à l’ERP."
    >
      <LeadBackoffice />
    </MainLayout>
  );
}
