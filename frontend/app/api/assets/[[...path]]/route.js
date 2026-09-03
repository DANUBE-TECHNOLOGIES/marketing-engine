import {
  proxyBackendRequest,
} from "../../../../lib/server/backend-proxy.js";

async function handler(request, context) {
  const parameters =
    await context.params;

  return proxyBackendRequest({
    request,
    prefix: "/api/assets",
    path: parameters?.path || [],
  });
}

export const dynamic = "force-dynamic";

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
