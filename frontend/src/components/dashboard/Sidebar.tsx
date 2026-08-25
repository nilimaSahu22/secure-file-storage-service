import { Files, Share2 } from "lucide-react";

export type DashboardFilter = "all" | "shared";

interface SidebarProps {
  filter: DashboardFilter;
  onFilterChange: (filter: DashboardFilter) => void;
}

const items: { key: DashboardFilter; label: string; icon: typeof Files }[] = [
  { key: "all", label: "All Files", icon: Files },
  { key: "shared", label: "Shared", icon: Share2 },
];

export function Sidebar({ filter, onFilterChange }: SidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-100 p-4 sm:block">
      <div className="mb-6 px-2 text-lg font-semibold text-gray-900">Filework</div>
      <nav className="flex flex-col gap-1">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              filter === key
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
