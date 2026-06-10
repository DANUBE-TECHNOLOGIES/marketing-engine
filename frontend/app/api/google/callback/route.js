export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const backendUrl =
    "http://backend:4000/api/google/callback" +
    (code ? `?code=${encodeURIComponent(code)}` : "") +
    (error ? `?error=${encodeURIComponent(error)}` : "");

  const res = await fetch(backendUrl);

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "text/html"
    }
  });
}
