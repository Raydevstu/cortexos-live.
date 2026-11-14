import type { CortexEvent } from "../../shared-types/src";

export interface EventBus {
  publish<T extends CortexEvent>(event: T): Promise<void>;
  subscribe<T extends CortexEvent>(
    eventType: T["type"],
    handler: (event: T) => Promise<void>
  ): void;
}
