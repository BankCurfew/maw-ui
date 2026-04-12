/**
 * Office v2 staging server — serves maw-ui dist on port 3458
 * Proxies /api to maw-js backend on :3456 (HTTP)
 * Proxies /ws to maw-js backend on :3456 (WebSocket upgrade)
 */

const STATIC_DIR = `${import.meta.dir}/dist`;
const BACKEND = "http://localhost:3456";
const BACKEND_WS = "ws://localhost:3456";
const PORT = 3458;

Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade — proxy to backend
    if (url.pathname === "/ws" || url.pathname.startsWith("/ws/")) {
      const upgraded = server.upgrade(req, { data: { path: url.pathname + url.search } });
      if (upgraded) return undefined as any;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Proxy API requests to maw-js backend
    if (url.pathname.startsWith("/api/")) {
      const target = `${BACKEND}${url.pathname}${url.search}`;
      return fetch(target, {
        method: req.method,
        headers: req.headers,
        body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      });
    }

    // Serve static assets
    if (url.pathname !== "/") {
      const file = Bun.file(`${STATIC_DIR}${url.pathname}`);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    // Root — serve index.html (SPA fallback)
    return new Response(Bun.file(`${STATIC_DIR}/index.html`), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
  websocket: {
    open(ws) {
      const path = (ws.data as any)?.path || "/ws";
      const backendUrl = `${BACKEND_WS}${path}`;
      const upstream = new WebSocket(backendUrl);

      upstream.addEventListener("open", () => {
        (ws.data as any)._upstream = upstream;
      });
      upstream.addEventListener("message", (e) => {
        try { ws.send(e.data); } catch {}
      });
      upstream.addEventListener("close", () => {
        try { ws.close(); } catch {}
      });
      upstream.addEventListener("error", () => {
        try { ws.close(); } catch {}
      });

      (ws.data as any)._upstream = upstream;
    },
    message(ws, msg) {
      const upstream = (ws.data as any)?._upstream as WebSocket | undefined;
      if (upstream?.readyState === WebSocket.OPEN) {
        upstream.send(msg);
      }
    },
    close(ws) {
      const upstream = (ws.data as any)?._upstream as WebSocket | undefined;
      if (upstream) {
        try { upstream.close(); } catch {}
      }
    },
  },
});

console.log(`Office v2 staging server running on http://localhost:${PORT}`);
