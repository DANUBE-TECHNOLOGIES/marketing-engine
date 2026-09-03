import "../indexation.css";
import "./performance.css";
import SearchPerformanceClient from "./SearchPerformanceClient";

export const metadata = {
  title: "Performance Search Console | Marketing Engine",
  robots: { index: false, follow: false },
};

export default function SearchPerformancePage() {
  return <SearchPerformanceClient />;
}
