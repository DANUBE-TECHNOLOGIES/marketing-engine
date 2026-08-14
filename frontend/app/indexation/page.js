import "./indexation.css";
import IndexationCockpitClient from "./IndexationCockpitClient";

export const metadata = {
  title: "Indexation | Marketing Engine",
  robots: {
    index: false,
    follow: false,
  },
};

export default function IndexationPage() {
  return <IndexationCockpitClient />;
}
