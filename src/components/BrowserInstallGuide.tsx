import { Copy, MonitorCog, Terminal } from "lucide-react";
import { useState } from "react";

const installCommand =
  "curl -fsSL https://raw.githubusercontent.com/tugrakaymakcioglu/LuftFixed/8e290e90e12fd689e0b2de656760c65dfb737ce1/scripts/install-linux.sh | bash";

export function BrowserInstallGuide() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");

  const copyCommand = async () => {
    if (!navigator.clipboard) {
      setCopyState("manual");
      return;
    }

    try {
      await navigator.clipboard.writeText(installCommand);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
    }
  };

  return (
    <main className="install-gate" aria-label="Native kurulum gerekli">
      <section className="install-panel">
        <div className="install-icon">
          <MonitorCog size={34} aria-hidden="true" />
        </div>
        <div className="install-copy">
          <p className="install-kicker">Tarayıcı önizlemesi</p>
          <h1>Sistem bilgisi için LuftFixed masaüstü uygulamasını aç.</h1>
          <p>
            Linux dağıtımı, paket yöneticisi, çekirdek ve yönetici yetkisi tarayıcıdan okunamaz. Aşağıdaki tek komut
            doğru paketi kurar, başlat menüsü kaydını oluşturur ve uygulamayı native pencerede açar.
          </p>
        </div>

        <div className="install-command">
          <div>
            <Terminal size={18} aria-hidden="true" />
            <span>Tek komut</span>
          </div>
          <code>{installCommand}</code>
          <button type="button" onClick={copyCommand}>
            <Copy size={16} aria-hidden="true" />
            {copyState === "copied" ? "Kopyalandı" : copyState === "manual" ? "Elle kopyala" : "Kopyala"}
          </button>
        </div>
      </section>
    </main>
  );
}
