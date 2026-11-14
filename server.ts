import http from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { getCortexRuntime } from "./lib/runtime/cortex-runtime.ts";
import { getWsHub } from "./lib/runtime/ws-hub.ts";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number.parseInt(
  process.env.CORTEX_PORT || process.env.DEFAULT_APP_PORT || "3000",
  10
);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function startServer(): Promise<void> {
  await app.prepare();
  const upgradeHandler = app.getUpgradeHandler();

  const runtime = getCortexRuntime();
  await runtime.bootstrap();

  const wsHub = getWsHub();
  const wss = new WebSocketServer({ noServer: true });
  wsHub.attachServer(wss);

  wss.on("connection", (ws) => {
    wsHub.registerClient(ws);
    wsHub.sendToClient(ws, {
      type: "presence.snapshot",
      timestamp: new Date().toISOString(),
      payload: runtime.getSnapshot(),
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; projectId?: string };
        if (msg.type === "ping") {
          wsHub.sendToClient(ws, {
            type: "pong",
            timestamp: new Date().toISOString(),
            payload: { clients: wsHub.clientCount() },
          });
        } else if (msg.type === "request.snapshot") {
          wsHub.sendToClient(ws, {
            type: "presence.snapshot",
            timestamp: new Date().toISOString(),
            payload: runtime.getSnapshot(msg.projectId),
          });
        }
      } catch {
        // Ignore malformed client frames cleanly
      }
    });
  });

  const server = http.createServer((req, res) => {
    void handle(req, res);
  });

  server.on("upgrade", (req, socket, head) => {
    const pathname = new URL(req.url || "/", `http://localhost:${port}`).pathname;
    if (pathname === "/ws/agent-activity") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
      return;
    }
    void upgradeHandler(req, socket, head);
  });

  server.listen(port, hostname, () => {
    console.log(
      `[CortexOS] HTTP + WebSocket Runtime listening on http://${hostname}:${port} (WS /ws/agent-activity)`
    );
  });
}

startServer().catch((err) => {
  console.error("[CortexOS] Fatal server bootstrap error:", err);
  process.exit(1);
});
