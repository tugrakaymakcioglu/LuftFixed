import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: string | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: errorMessage(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("LuftFixed render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <FatalErrorScreen message={this.state.error} />;
    }

    return this.props.children;
  }
}

function FatalErrorScreen({ message }: { message: string }) {
  return (
    <main className="fatal-gate" aria-label="Uygulama hatası">
      <section className="fatal-panel">
        <strong>LuftFixed arayüzü başlatılamadı</strong>
        <h1>Beyaz ekran yerine hata yakalandı.</h1>
        <p>
          Kali/WebKit içinde arayüz başlarken bir hata oluştu. Terminalden kurulum komutunu tekrar çalıştırarak en
          güncel sürümü kur.
        </p>
        <pre>{message}</pre>
      </section>
    </main>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  return String(error);
}

function renderFatalFallback(message: string) {
  const root = document.getElementById("root");

  if (!root) {
    return;
  }

  root.textContent = "";

  const main = document.createElement("main");
  main.className = "fatal-gate";
  const section = document.createElement("section");
  section.className = "fatal-panel";
  const label = document.createElement("strong");
  label.textContent = "LuftFixed arayüzü başlatılamadı";
  const title = document.createElement("h1");
  title.textContent = "Başlangıç hatası yakalandı.";
  const body = document.createElement("p");
  body.textContent = "JavaScript başlatılırken hata oluştu. Güncel kurulum komutunu tekrar çalıştır.";
  const detail = document.createElement("pre");
  detail.textContent = message;

  section.append(label, title, body, detail);
  main.append(section);
  root.append(main);
}

window.addEventListener("error", (event) => {
  renderFatalFallback(event.error ? errorMessage(event.error) : event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  renderFatalFallback(errorMessage(event.reason));
});

try {
  createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
} catch (error) {
  renderFatalFallback(errorMessage(error));
}
