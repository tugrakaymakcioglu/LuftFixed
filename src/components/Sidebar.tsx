import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Code2,
  Gamepad2,
  Globe2,
  Layers3,
  MonitorCog,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

interface SidebarProps {
  categories: string[];
  current: string;
  counts: Record<string, number>;
  onChange: (category: string) => void;
}

const categoryIcons: Record<string, LucideIcon> = {
  Tümü: Layers3,
  Güncellemeler: PackageCheck,
  Uygulamalar: AppWindow,
  Tarayıcılar: Globe2,
  Sürücüler: MonitorCog,
  Güvenlik: ShieldCheck,
  Oyun: Gamepad2,
  Geliştirici: Code2,
  Temizlik: Trash2,
};

export function Sidebar({ categories, current, counts, onChange }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="LuftFixed bölümleri">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <Sparkles size={20} />
        </div>
        <div>
          <strong>LuftFixed</strong>
          <span>Linux yardımcı aracı</span>
        </div>
      </div>

      <nav className="category-nav">
        {categories.map((category) => {
          const Icon = categoryIcons[category] ?? Layers3;
          const isActive = category === current;

          return (
            <button
              className={isActive ? "nav-item active" : "nav-item"}
              key={category}
              type="button"
              onClick={() => onChange(category)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{category}</span>
              <small>{counts[category] ?? 0}</small>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
