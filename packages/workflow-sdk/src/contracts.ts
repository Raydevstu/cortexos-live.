export interface CortexWorkflow {
  id: string;
  name: string;
  start(): Promise<void>;
  execute(): Promise<void>;
  monitor(): Promise<void>;
  recover(): Promise<void>;
  rollback(): Promise<void>;
  complete(): Promise<void>;
  fail(): Promise<void>;
}

export interface Activity {
  id: string;
  execute(): Promise<void>;
  validate(): Promise<boolean>;
  audit(): Promise<void>;
  report?(): Promise<void>;
}
