import { CheckCircle2, ClipboardList, Play, ShieldCheck, Terminal, XCircle } from "lucide-react";
import type { ActionDefinition, QueueItem } from "../types";

interface ExecutionPanelProps {
  selectedActions: ActionDefinition[];
  queue: QueueItem[];
  dryRun: boolean;
  isRunning: boolean;
  canRunCommands: boolean;
  onDryRunChange: (value: boolean) => void;
  onExecute: () => void;
}

export function ExecutionPanel({
  selectedActions,
  queue,
  dryRun,
  isRunning,
  canRunCommands,
  onDryRunChange,
  onExecute,
}: ExecutionPanelProps) {
  const supportedActions = selectedActions.filter((action) => action.supported);
  const commands = supportedActions.flatMap((action) =>
    action.commands.map((command) => ({ actionId: action.id, title: action.title, command: command.preview })),
  );
  const realRunBlocked = !dryRun && !canRunCommands;
  const plannedItems =
    queue.length > 0
      ? queue
      : supportedActions.map((action) => ({
          actionId: action.id,
          title: action.title,
          status: "pending" as const,
          logs: [],
        }));

  return (
    <aside className="execution-panel" aria-label="Yürütme planı">
      <div className="panel-section">
        <div className="panel-title">
          <ClipboardList size={18} aria-hidden="true" />
          <h2>Yürütme planı</h2>
        </div>

        <label className="toggle-row">
          <span>
            <strong>Güvenli önizleme</strong>
            <small>Sistemde değişiklik yapmadan planı test eder.</small>
          </span>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(event) => onDryRunChange(event.target.checked)}
          />
        </label>

        {realRunBlocked ? (
          <p className="inline-warning">Gerçek yürütme yalnızca Linux masaüstü uygulamasında açılır.</p>
        ) : null}

        <button
          className="run-button"
          type="button"
          disabled={supportedActions.length === 0 || isRunning || realRunBlocked}
          onClick={onExecute}
        >
          <Play size={17} aria-hidden="true" />
          {isRunning ? "Çalışıyor" : "Seçili işlemleri çalıştır"}
        </button>
      </div>

      <div className="panel-section command-preview">
        <div className="panel-title">
          <Terminal size={18} aria-hidden="true" />
          <h2>Komut önizlemesi</h2>
        </div>

        {commands.length > 0 ? (
          <div className="command-list">
            {commands.map((item, index) => (
              <code key={`${item.actionId}-${item.command}`}>
                <span>{index + 1}</span>
                $ {item.command}
              </code>
            ))}
          </div>
        ) : (
          <p className="empty-copy">Önizleme için desteklenen bir işlem seç.</p>
        )}
      </div>

      <div className="panel-section">
        <div className="panel-title">
          <ShieldCheck size={18} aria-hidden="true" />
          <h2>İşlem kuyruğu</h2>
        </div>

        {plannedItems.length > 0 ? (
          <div className="queue-list">
            {plannedItems.map((item, index) => (
              <div className={`queue-item ${item.status}`} key={item.actionId}>
                {item.status === "failed" ? (
                  <XCircle size={16} aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={16} aria-hidden="true" />
                )}
                <div>
                  <strong>
                    {index + 1}. {item.title}
                  </strong>
                  <small>{queue.length > 0 ? statusLabel(item.status) : "Seçili işlem planı"}</small>
                  {item.logs.length > 0 ? (
                    <details className="queue-logs">
                      <summary>Günlük</summary>
                      <pre>{item.logs.join("\n")}</pre>
                    </details>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">Henüz işlem çalıştırılmadı.</p>
        )}
      </div>
    </aside>
  );
}

function statusLabel(status: QueueItem["status"]) {
  if (status === "pending") {
    return "Sırada bekliyor";
  }

  if (status === "running") {
    return "Komut planı kontrol ediliyor";
  }

  if (status === "success") {
    return "Başarıyla tamamlandı";
  }

  return "Hata oluştu";
}
