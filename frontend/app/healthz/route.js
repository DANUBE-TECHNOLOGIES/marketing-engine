export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "marketing-engine-frontend",
      layer: "next-runtime",
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    }
  );
}
