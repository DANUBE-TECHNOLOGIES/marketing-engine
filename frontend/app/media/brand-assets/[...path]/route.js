import {
  proxyBackendRequest,
} from "../../../../lib/server/backend-proxy.js";

async function handler(
  request,
  context
) {
  const parameters =
    await context.params;

  return proxyBackendRequest({
    request,
    prefix:
      "/media/brand-assets",
    path:
      parameters?.path ||
      [],
  });
}

export const dynamic =
  "force-dynamic";

export const GET = handler;
export const HEAD = handler;
