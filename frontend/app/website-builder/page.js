import WebsiteBuilderClient from "../../components/website-builder/WebsiteBuilderClient";
import "./website-builder.css";

export const metadata = {
  title: "Website Builder | Mondescale Local Engine",
  description:
    "Constructeur de pages pour les mini-sites des agences Mondescale",
};

export default function WebsiteBuilderPage() {
  return <WebsiteBuilderClient />;
}
