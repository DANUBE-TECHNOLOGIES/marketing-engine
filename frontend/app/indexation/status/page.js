import "../indexation.css";
import SearchConsoleStatusClient from "./SearchConsoleStatusClient";

export const metadata = {
  title: "Suivi Search Console | Marketing Engine",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SearchConsoleStatusPage() {
  return <SearchConsoleStatusClient />;
}
