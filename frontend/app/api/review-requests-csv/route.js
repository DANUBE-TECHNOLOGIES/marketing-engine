export async function GET() {
  const res = await fetch("http://backend:4000/review-requests.csv", {
    cache: "no-store"
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=demandes-avis.csv"
    }
  });
}
