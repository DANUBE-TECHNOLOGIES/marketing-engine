export async function GET(request, { params }) {
  const resolvedParams = await params;
  const agencyId = resolvedParams.id;

  const res = await fetch(`http://backend:4000/agency/${agencyId}/actions.csv`, {
    cache: "no-store"
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=actions-agence-${agencyId}.csv`
    }
  });
}
