import type { ActionDefinition, CommandStep, DetectedSystem, ExecutionResult, SafetyLevel } from "../types";

interface CatalogFile {
  schemaVersion: number;
  actions: CatalogAction[];
}

interface CatalogAction {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  requiresAdmin: boolean;
  reversible: boolean;
  safety: SafetyLevel;
  estimatedDuration: string;
  tags: string[];
  commands: Record<string, CatalogCommand[]>;
}

interface CatalogCommand {
  program: string;
  args?: string[];
  requiresAdmin?: boolean;
}

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    platform?: string;
  };
}

const catalogUrl = "/catalog/actions.tr.json";

let catalogPromise: Promise<CatalogFile> | null = null;

export async function loadCatalogActions(packageManager: string): Promise<ActionDefinition[]> {
  const catalog = await loadCatalog();

  return catalog.actions.map((action) => normalizeAction(action, packageManager));
}

export async function createBrowserExecution(
  actionId: string,
  packageManager: string,
  dryRun: boolean,
): Promise<ExecutionResult> {
  const catalog = await loadCatalog();
  const action = catalog.actions.find((candidate) => candidate.id === actionId);

  if (!action) {
    throw new Error("İşlem kataloğunda bu kayıt bulunamadı.");
  }

  const commands = buildCommandSteps(action.commands[packageManager] ?? []);

  if (commands.length === 0) {
    throw new Error("Bu işlem algılanan paket yöneticisi için desteklenmiyor.");
  }

  if (!dryRun) {
    throw new Error("Gerçek komut yürütme yalnızca Linux masaüstü uygulamasında kullanılabilir.");
  }

  return {
    actionId,
    status: "dry-run",
    logs: [
      "Tarayıcı doğrulama modu: sistemde değişiklik yapılmadı.",
      ...commands.map((command) => `$ ${command.preview}`),
    ],
  };
}

export function createBrowserSystemProfile(): DetectedSystem {
  const platform = getBrowserPlatform();
  const isLinux = /linux/i.test(platform);

  return {
    operatingSystem: isLinux ? "Linux" : platform || "Tarayıcı",
    distribution: "Masaüstü uygulamasında algılanacak",
    version: "",
    desktopEnvironment: "Masaüstü uygulamasında algılanacak",
    packageManager: "unknown",
    kernel: "Tarayıcı erişemez",
    architecture: getBrowserPlatform(),
    hostname: window.location.hostname || "localhost",
    isLinux,
    canRunCommands: false,
    adminMethod: "Yok",
    confidence: "Tarayıcı kapasitesi",
    warnings: [
      "Tarayıcı güvenlik modeli Linux dağıtımını ve paket yöneticisini okuyamaz. Gerçek algılama Tauri masaüstü uygulamasında yapılır.",
    ],
  };
}

async function loadCatalog(): Promise<CatalogFile> {
  catalogPromise ??= fetch(catalogUrl, { cache: "no-store" }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`İşlem kataloğu yüklenemedi: ${response.status}`);
    }

    const catalog = (await response.json()) as CatalogFile;
    validateCatalog(catalog);
    return catalog;
  });

  return catalogPromise;
}

function normalizeAction(action: CatalogAction, packageManager: string): ActionDefinition {
  const packageManagers = Object.keys(action.commands);
  const commands = buildCommandSteps(action.commands[packageManager] ?? []);

  return {
    id: action.id,
    title: action.title,
    description: action.description,
    category: action.category,
    impact: action.impact,
    requiresAdmin: action.requiresAdmin,
    reversible: action.reversible,
    safety: action.safety,
    estimatedDuration: action.estimatedDuration,
    tags: [...action.tags],
    commands,
    packageManagers,
    supported: commands.length > 0,
  };
}

function buildCommandSteps(commands: CatalogCommand[]): CommandStep[] {
  return commands.map((command) => {
    const step = {
      program: command.program,
      args: command.args ?? [],
      requiresAdmin: Boolean(command.requiresAdmin),
    };

    return {
      ...step,
      preview: formatCommand(step),
    };
  });
}

function formatCommand(command: Omit<CommandStep, "preview">) {
  const args = command.args.map((arg) => (/\s/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg));
  const executable = [command.program, ...args].join(" ");

  return command.requiresAdmin ? `pkexec ${executable}` : executable;
}

function validateCatalog(catalog: CatalogFile) {
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.actions)) {
    throw new Error("İşlem kataloğu şeması desteklenmiyor.");
  }

  const ids = new Set<string>();

  for (const action of catalog.actions) {
    if (!action.id || ids.has(action.id)) {
      throw new Error(`Geçersiz veya tekrar eden işlem kimliği: ${action.id}`);
    }

    ids.add(action.id);
  }
}

function getBrowserPlatform() {
  const userAgentNavigator = navigator as NavigatorWithUserAgentData;

  if (userAgentNavigator.userAgentData?.platform) {
    return userAgentNavigator.userAgentData.platform;
  }

  return navigator.platform || navigator.userAgent || "Bilinmiyor";
}
