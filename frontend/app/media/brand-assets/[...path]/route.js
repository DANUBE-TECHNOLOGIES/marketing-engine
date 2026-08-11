import {
  proxyBackendRequest,
} from "../../../../lib/server/backend-proxy.js";

async function handler(
  request,
  context
) {
  const parameters =
    await context.params;

  const response = await proxyBackendRequest({
    request,
    prefix:
      "/media/brand-assets",
    path:
      parameters?.path ||
      [],
  });

  if (response.ok) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  return response;
}

export const dynamic =
  "force-dynamic";

export const GET = handler;
export const HEAD = handler;
