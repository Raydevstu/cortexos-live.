import type { CortexEvent } from "../../shared-types/src/index.ts";

export type EventHandler<T extends CortexEvent = CortexEvent> = (
  event: T
) => Promise<void> | void;

export interface EventBus {
  publish<T extends CortexEvent>(event: T): Promise<void>;
  subscribe<T extends CortexEvent>(
    eventType: T["type"] | "*",
    handler: EventHandler<T>
  ): () => void;
  recentEvents(limit?: number): CortexEvent[];
}

export class CortexEventBus implements EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private seenIdempotencyKeys = new Set<string>();
  private history: CortexEvent[] = [];
  private maxHistory: number;

  constructor(maxHistory = 200) {
    this.maxHistory = maxHistory;
  }

  subscribe<T extends CortexEvent>(
    eventType: T["type"] | "*",
    handler: EventHandler<T>
  ): () => void {
    const key = String(eventType);
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set<EventHandler>();
      this.handlers.set(key, set);
    }
    const wrapped = handler as EventHandler;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
    };
  }

  async publish<T extends CortexEvent>(event: T): Promise<void> {
    if (event.idempotencyKey) {
      if (this.seenIdempotencyKeys.has(event.idempotencyKey)) {
        return;
      }
      this.seenIdempotencyKeys.add(event.idempotencyKey);
      if (this.seenIdempotencyKeys.size > 1000) {
        const first = this.seenIdempotencyKeys.values().next().value;
        if (first) this.seenIdempotencyKeys.delete(first);
      }
    }

    this.history.unshift(event);
    if (this.history.length > this.maxHistory) {
      this.history.length = this.maxHistory;
    }

    const specific = this.handlers.get(String(event.type));
    const wildcard = this.handlers.get("*");

    const targets: EventHandler[] = [
      ...(specific ? Array.from(specific) : []),
      ...(wildcard ? Array.from(wildcard) : []),
    ];

    for (const handler of targets) {
      await handler(event);
    }
  }

  recentEvents(limit = 50): CortexEvent[] {
    return this.history.slice(0, limit);
  }
}
