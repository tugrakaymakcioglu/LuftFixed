import { useEffect, useMemo, useState } from "react";
import { ActionCatalog } from "./components/ActionCatalog";
import { ExecutionPanel } from "./components/ExecutionPanel";
import { Sidebar } from "./components/Sidebar";
import { SystemSummary } from "./components/SystemSummary";
import { detectSystem, executeAction, loadActions } from "./lib/tauri";
import type { ActionDefinition, DetectedSystem, QueueItem } from "./types";

const allCategory = "Tümü";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function App() {
  const [system, setSystem] = useState<DetectedSystem | null>(null);
  const [actions, setActions] = useState<ActionDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(allCategory);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dryRun, setDryRun] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const detected = await detectSystem();
        const catalog = await loadActions(detected.packageManager);

        if (!active) {
          return;
        }

        setSystem(detected);
        setActions(catalog);
        setSelectedIds(new Set(catalog.filter((action) => action.supported).slice(0, 2).map((action) => action.id)));
      } catch (error) {
        if (!active) {
          return;
        }

        setBootError(error instanceof Error ? error.message : "Sistem algılanamadı.");
      }
    }

    void boot();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [allCategory, ...Array.from(new Set(actions.map((action) => action.category)))],
    [actions],
  );

  const counts = useMemo(
    () =>
      actions.reduce<Record<string, number>>(
        (accumulator, action) => {
          accumulator[allCategory] += 1;
          accumulator[action.category] = (accumulator[action.category] ?? 0) + 1;
          return accumulator;
        },
        { [allCategory]: 0 },
      ),
    [actions],
  );

  const filteredActions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return actions.filter((action) => {
      const matchesCategory = selectedCategory === allCategory || action.category === selectedCategory;
      const haystack = [action.title, action.description, action.category, action.tags.join(" ")]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [actions, search, selectedCategory]);

  const selectedActions = useMemo(
    () => actions.filter((action) => selectedIds.has(action.id)),
    [actions, selectedIds],
  );

  const toggleAction = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const runSelectedActions = async () => {
    if (!system || isRunning) {
      return;
    }

    const runnable = selectedActions.filter((action) => action.supported);

    if (runnable.length === 0) {
      return;
    }

    setIsRunning(true);
    setQueue(runnable.map((action) => ({ actionId: action.id, title: action.title, status: "pending", logs: [] })));

    for (const action of runnable) {
      setQueue((current) =>
        current.map((item) => (item.actionId === action.id ? { ...item, status: "running" } : item)),
      );

      try {
        const result = await executeAction(action.id, system.packageManager, dryRun);
        setQueue((current) =>
          current.map((item) =>
            item.actionId === action.id
              ? { ...item, status: result.status === "failed" ? "failed" : "success", logs: result.logs }
              : item,
          ),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "İşlem tamamlanamadı.";
        setQueue((current) =>
          current.map((item) =>
            item.actionId === action.id ? { ...item, status: "failed", logs: [message] } : item,
          ),
        );
      }

      await wait(260);
    }

    setIsRunning(false);
  };

  return (
    <div className="app-shell">
      <Sidebar categories={categories} current={selectedCategory} counts={counts} onChange={setSelectedCategory} />

      <main className="workspace">
        <SystemSummary system={system} />
        {bootError ? <div className="boot-error">{bootError}</div> : null}
        <ActionCatalog
          actions={filteredActions}
          selectedIds={selectedIds}
          queue={queue}
          search={search}
          onSearch={setSearch}
          onToggle={toggleAction}
        />
      </main>

      <ExecutionPanel
        selectedActions={selectedActions}
        queue={queue}
        dryRun={dryRun}
        isRunning={isRunning}
        canRunCommands={Boolean(system?.canRunCommands)}
        onDryRunChange={setDryRun}
        onExecute={runSelectedActions}
      />
    </div>
  );
}
