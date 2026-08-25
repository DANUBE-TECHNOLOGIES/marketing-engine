const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000";

export async function GET(req) {
  const incoming = new URL(req.url);
  const backendUrl = new URL("/api/google/callback", BACKEND_URL);

  // Forward the OAuth callback parameters verbatim. Search Console relies on
  // its signed `state`; dropping it would route the authorization code to the
  // Google Business handler instead of the isolated Search Console handler.
  for (const [key, value] of incoming.searchParams.entries()) {
    backendUrl.searchParams.append(key, value);
  }

  const res = await fetch(backendUrl, {
    redirect: "manual",
    cache: "no-store",
  });
  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "text/html",
      "Cache-Control": "no-store",
    },
  });
}
