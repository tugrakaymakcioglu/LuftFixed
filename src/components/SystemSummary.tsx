import { AlertTriangle, Cpu, Monitor, Package, ShieldCheck } from "lucide-react";
import type { DetectedSystem } from "../types";

interface SystemSummaryProps {
  system: DetectedSystem | null;
}

export function SystemSummary({ system }: SystemSummaryProps) {
  if (!system) {
    return (
      <section className="system-summary loading" aria-label="Sistem algılama">
        <div className="skeleton title" />
        <div className="summary-grid">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </section>
    );
  }

  const rows = [
    {
      label: "Dağıtım",
      value: `${system.distribution} ${system.version}`.trim(),
      icon: Monitor,
    },
    {
      label: "Masaüstü",
      value: system.desktopEnvironment || "Bilinmiyor",
      icon: ShieldCheck,
    },
    {
      label: "Paket yöneticisi",
      value: system.packageManager || "Algılanamadı",
      icon: Package,
    },
    {
      label: "Çekirdek",
      value: `${system.kernel} / ${system.architecture}`,
      icon: Cpu,
    },
    {
      label: "Yönetici yetkisi",
      value: system.adminMethod || "Algılanamadı",
      icon: ShieldCheck,
    },
  ];

  const healthLabel = system.canRunCommands
    ? "Çalıştırmaya hazır"
    : system.isLinux
      ? "Yetki kontrolü gerekli"
      : "Masaüstü uygulaması gerekli";

  return (
    <section className="system-summary" aria-label="Algılanan sistem">
      <div className="summary-heading">
        <div>
          <h1>Sistem algılandı</h1>
          <p>
            {system.hostname} üzerinde {system.operatingSystem} profili hazır.
          </p>
        </div>
        <div className={system.canRunCommands ? "health-chip ready" : "health-chip warning"}>
          {healthLabel}
        </div>
      </div>

      <div className="summary-grid">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <div className="summary-cell" key={row.label}>
              <Icon size={18} aria-hidden="true" />
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          );
        })}
      </div>

      {system.warnings.length > 0 ? (
        <div className="warning-list">
          {system.warnings.map((warning) => (
            <div className="warning-line" key={warning}>
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
