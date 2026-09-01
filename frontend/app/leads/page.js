import MainLayout from "../components/MainLayout";
import LeadInbox from "./LeadInbox";

export const metadata = {
  title: "Demandes clients | Marketing Engine",
  robots: { index: false, follow: false },
};

export default function LeadsPage() {
  return (
    <MainLayout
      title="Demandes clients"
      subtitle="Lecture rapide des demandes reçues depuis les mini-sites avant leur reprise par l’ERP."
    >
      <LeadInbox />
    </MainLayout>
  );
}
