import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const scriptUrl = new URL("../../scripts/mse-25-71-proxy-discovery.sh", import.meta.url);

async function source() {
  return readFile(scriptUrl, "utf8");
}

test("reverse proxy discovery remains read-only and targets common proxy runtimes", async () => {
  const text = await source();

  assert.match(text, /^#!\/usr\/bin\/env bash/m);
  assert.match(text, /openresty\|nginx\|proxy-manager\|nginxproxymanager\|traefik\|caddy\|haproxy/);
  assert.match(text, /PROXY_CONFIG_REFERENCES/);
  assert.match(text, /server_name\[\[:space:\]\].*agences/);
  assert.match(text, /proxy_pass/);
  assert.match(text, /SHARED_FRONTEND_NETWORKS/);
  assert.match(text, /PROXY_TO_FRONTEND_LIVENESS/);
  assert.match(text, /http:\/\/127\.0\.0\.1:\$\{FRONTEND_PORT\}\/healthz/);

  assert.doesNotMatch(text, /docker\s+(restart|stop|rm|network\s+connect|network\s+disconnect)/);
  assert.doesNotMatch(text, /systemctl\s+(restart|stop|start|reload)/);
});

test("proxy discovery documents the container loopback trap", async () => {
  const text = await source();

  assert.match(text, /127\.0\.0\.1:3000 from inside its own container/);
  assert.match(text, /loopback points to the proxy container itself, not mle_frontend/);
});
