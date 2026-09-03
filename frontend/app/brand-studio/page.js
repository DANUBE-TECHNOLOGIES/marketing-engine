import BrandStudioWorkspace from "../../components/brand-studio/BrandStudioWorkspace";
import AgencyLaunchManager from "../../components/agency-launch/AgencyLaunchManager";

export const metadata = {
  title:
    "Brand Studio | Mondescale Platform",

  description:
    "Gestion centralisée de l’identité visuelle, des médias et des contenus juridiques des mini-sites Mondescale.",
};

export default function BrandStudioPage() {
  return (
    <>
      <BrandStudioWorkspace
        initialAgencyId={6}
      />

      <section
        style={{
          width: "100%",
          maxWidth: "1600px",
          margin: "32px auto 0",
          padding: "0 24px 48px",
          boxSizing: "border-box",
        }}
      >
        <AgencyLaunchManager />
      </section>
    </>
  );
}
