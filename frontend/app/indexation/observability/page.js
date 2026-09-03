import "../indexation.css";
import "./observability.css";
import IndexationObservabilityClient from "./IndexationObservabilityClient";

export const metadata = {
  title: "Observabilité indexation | Marketing Engine",
  robots: { index: false, follow: false },
};

export default function IndexationObservabilityPage() {
  return <IndexationObservabilityClient />;
}
