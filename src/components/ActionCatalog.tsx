import { CheckCircle2, Clock3, LockKeyhole, RotateCcw, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ActionDefinition, QueueItem, SafetyLevel } from "../types";

interface ActionCatalogProps {
  actions: ActionDefinition[];
  selectedIds: Set<string>;
  queue: QueueItem[];
  search: string;
  onSearch: (value: string) => void;
  onToggle: (id: string) => void;
}

const safetyMeta: Record<
  SafetyLevel,
  {
    label: string;
    icon: typeof ShieldCheck;
  }
> = {
  safe: { label: "Güvenli", icon: ShieldCheck },
  admin: { label: "Yönetici izni", icon: LockKeyhole },
  advanced: { label: "Dikkatli kullan", icon: ShieldAlert },
};

export function ActionCatalog({
  actions,
  selectedIds,
  queue,
  search,
  onSearch,
  onToggle,
}: ActionCatalogProps) {
  return (
    <section className="catalog" aria-label="İşlem kataloğu">
      <div className="section-header">
        <div>
          <h2>İşlem kataloğu</h2>
          <p>Dağıtımına uygun hazır işlemleri seç, komut planını kontrol et.</p>
        </div>
        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="İşlem ara"
          />
        </label>
      </div>

      <div className="action-list">
        {actions.map((action) => {
          const selected = selectedIds.has(action.id);
          const status = queue.find((item) => item.actionId === action.id)?.status;
          const SafetyIcon = safetyMeta[action.safety].icon;

          return (
            <article
              className={`action-card ${selected ? "selected" : ""} ${!action.supported ? "disabled" : ""}`}
              key={action.id}
            >
              <label className="action-select">
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={!action.supported}
                  onChange={() => onToggle(action.id)}
                />
                <span>
                  <strong>{action.title}</strong>
                  <small>{action.category}</small>
                </span>
              </label>

              <p>{action.description}</p>

              <div className="action-meta">
                <span className={`safety ${action.safety}`}>
                  <SafetyIcon size={14} aria-hidden="true" />
                  {safetyMeta[action.safety].label}
                </span>
                <span>
                  <Clock3 size={14} aria-hidden="true" />
                  {action.estimatedDuration}
                </span>
                {action.reversible ? (
                  <span>
                    <RotateCcw size={14} aria-hidden="true" />
                    Geri alınabilir
                  </span>
                ) : null}
              </div>

              <div className="action-footer">
                <span>{action.impact}</span>
                {status ? (
                  <strong className={`queue-status ${status}`}>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    {status === "success" ? "Tamamlandı" : status === "running" ? "Çalışıyor" : "Bekliyor"}
                  </strong>
                ) : null}
                {!action.supported ? <strong className="unsupported">Bu dağıtım için hazır değil</strong> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

