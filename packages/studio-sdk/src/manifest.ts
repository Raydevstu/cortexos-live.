export interface StudioManifest {
  id: string;
  name: string;
  version: string;
  mission: string;
  capabilities: string[];
  supportedArtifacts: string[];
  tools: string[];
  constraints: string[];
}
