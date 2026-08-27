const BACKEND_URL = String(
  process.env.BACKEND_INTERNAL_URL ||
    process.env.API_INTERNAL_URL ||
    "http://backend:4000"
).replace(/\/+$/g, "");

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";

const ALLOWED_OPERATIONS = new Set(["policy", "preview", "apply", "rollback"]);

function backendPath(siteKey, operation = []) {
  const key = String(siteKey || "").trim();
  if (!key) throw new Error("Mini-site manquant.");

  const parts = Array.isArray(operation) ? operation : [];
  if (parts.length > 1 || (parts[0] && !ALLOWED_OPERATIONS.has(parts[0]))) {
    const error = new Error("Opération de paiement flexible non supportée.");
    error.status = 404;
    throw error;
  }

  const suffix = parts[0] ? `/${parts[0]}` : "";
  return `/api/agency-sites/${encodeURIComponent(key)}/flexible-payment${suffix}`;
}

async function proxy(request, context, method) {
  try {
    const params = await context.params;
    const path = backendPath(params.siteKey, params.operation);
    const headers = {
      accept: "application/json",
      "x-tenant-slug": TENANT_SLUG,
    };

    const options = {
      method,
      headers,
      cache: "no-store",
    };

    if (method !== "GET") {
      headers["content-type"] = "application/json";
      options.body = await request.text();
    }

    const response = await fetch(`${BACKEND_URL}${path}`, options);
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        code: "FLEXIBLE_PAYMENT_PROXY_ERROR",
        error: error?.message || "Proxy paiement flexible indisponible.",
      },
      { status: Number(error?.status || 500) }
    );
  }
}

export function GET(request, context) {
  return proxy(request, context, "GET");
}

export function POST(request, context) {
  return proxy(request, context, "POST");
}

export function PUT(request, context) {
  return proxy(request, context, "PUT");
}

export { backendPath };
