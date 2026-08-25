const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.INTERNAL_API_URL || process.env.BACKEND_URL || "http://backend:4000";

export async function GET() {
  const response = await fetch(new URL("/api/search-console/auth", BACKEND_URL), { redirect: "manual", cache: "no-store" });
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) return Response.redirect(location, 302);
  const body = await response.text();
  return new Response(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
