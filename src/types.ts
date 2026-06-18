export type SafetyLevel = "safe" | "admin" | "advanced";
export type QueueStatus = "pending" | "running" | "success" | "failed";

export interface CommandStep {
  program: string;
  args: string[];
  requiresAdmin: boolean;
  preview: string;
}

export interface DetectedSystem {
  operatingSystem: string;
  distribution: string;
  version: string;
  desktopEnvironment: string;
  packageManager: string;
  kernel: string;
  architecture: string;
  hostname: string;
  isLinux: boolean;
  canRunCommands: boolean;
  adminMethod: string;
  confidence: string;
  warnings: string[];
}

export interface ActionDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  requiresAdmin: boolean;
  reversible: boolean;
  supported: boolean;
  safety: SafetyLevel;
  estimatedDuration: string;
  commands: CommandStep[];
  tags: string[];
  packageManagers: string[];
}

export interface ExecutionResult {
  actionId: string;
  status: "dry-run" | "completed" | "failed";
  logs: string[];
}

export interface QueueItem {
  actionId: string;
  title: string;
  status: QueueStatus;
  logs: string[];
}
