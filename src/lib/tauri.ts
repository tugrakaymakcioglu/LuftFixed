import { invoke } from "@tauri-apps/api/core";
import { createBrowserExecution, createBrowserSystemProfile, loadCatalogActions } from "../data/catalog";
import type { ActionDefinition, DetectedSystem, ExecutionResult } from "../types";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function hasTauriRuntime() {
  return (
    typeof window !== "undefined" &&
    (Boolean(window.__TAURI_INTERNALS__) || Boolean((globalThis as { isTauri?: unknown }).isTauri))
  );
}

export async function detectSystem(): Promise<DetectedSystem> {
  if (!hasTauriRuntime()) {
    return createBrowserSystemProfile();
  }

  return invoke<DetectedSystem>("detect_system");
}

export async function loadActions(packageManager: string): Promise<ActionDefinition[]> {
  if (!hasTauriRuntime()) {
    return loadCatalogActions(packageManager);
  }

  return invoke<ActionDefinition[]>("list_actions", { packageManager });
}

export async function executeAction(
  actionId: string,
  packageManager: string,
  dryRun: boolean,
): Promise<ExecutionResult> {
  if (!hasTauriRuntime()) {
    return createBrowserExecution(actionId, packageManager, dryRun);
  }

  return invoke<ExecutionResult>("run_action", {
    actionId,
    packageManager,
    dryRun,
  });
}
