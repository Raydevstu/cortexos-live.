import type { WebSocket, WebSocketServer } from "ws";

export interface WsServerFrame<T = unknown> {
  type:
    | "presence.snapshot"
    | "agent.telemetry"
    | "event.dispatched"
    | "workflow.updated"
    | "work_request.updated"
    | "council.updated"
    | "pong";
  timestamp: string;
  payload: T;
}

declare global {
  var __cortexWsHub: CortexWsHub | undefined;
}

export class CortexWsHub {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  attachServer(wss: WebSocketServer): void {
    this.wss = wss;
  }

  registerClient(ws: WebSocket): void {
    this.clients.add(ws);
    ws.on("close", () => {
      this.clients.delete(ws);
    });
    ws.on("error", () => {
      this.clients.delete(ws);
    });
  }

  clientCount(): number {
    return this.clients.size;
  }

  sendToClient<T>(ws: WebSocket, frame: WsServerFrame<T>): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(frame));
    }
  }

  broadcast<T>(type: WsServerFrame<T>["type"], payload: T): void {
    const serialized = JSON.stringify({
      type,
      timestamp: new Date().toISOString(),
      payload,
    } satisfies WsServerFrame<T>);

    for (const client of this.clients) {
      if (client.readyState === 1) {
        try {
          client.send(serialized);
        } catch {
          this.clients.delete(client);
        }
      } else if (client.readyState > 1) {
        this.clients.delete(client);
      }
    }
  }
}

export function getWsHub(): CortexWsHub {
  if (!global.__cortexWsHub) {
    global.__cortexWsHub = new CortexWsHub();
  }
  return global.__cortexWsHub;
}
