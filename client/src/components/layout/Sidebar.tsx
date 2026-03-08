import { 
  Folder, 
  Search, 
  Clock, 
  Star, 
  Trash2, 
  Settings,
  HardDrive,
  Users,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: HardDrive, label: "My Drive", active: true },
  { icon: Building2, label: "Workspace" },
  { icon: Users, label: "Shared with me" },
  { icon: Clock, label: "Recent" },
  { icon: Star, label: "Starred" },
];

const SECONDARY_NAV = [
  { icon: Trash2, label: "Trash" },
  { icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r bg-sidebar flex flex-col h-full flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b">
        <div className="flex items-center gap-2.5 font-heading font-bold text-lg tracking-tight">
          <svg viewBox="0 0 32 32" className="h-7 w-7 flex-shrink-0" aria-label="Nuxeo logo">
            <rect width="32" height="32" rx="6" className="fill-primary" />
            <path d="M8 8L14.5 16L8 24H12L16 18.5L20 24H24L17.5 16L24 8H20L16 13.5L12 8H8Z" className="fill-primary-foreground" />
          </svg>
          <span className="text-primary">Nuxeo</span><span className="text-foreground">Manager</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                item.active 
                  ? "bg-primary/10 text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={2} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-8 mb-4 px-3">
          <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Collections
          </h3>
        </div>
        
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Folder className="h-4 w-4 text-cat-blue" strokeWidth={2} />
            Marketing
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Folder className="h-4 w-4 text-cat-teal" strokeWidth={2} />
            Engineering
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <Folder className="h-4 w-4 text-cat-purple" strokeWidth={2} />
            HR & Ops
          </button>
        </div>
      </div>

      <div className="p-3 border-t">
        <div className="space-y-1">
          {SECONDARY_NAV.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <item.icon className="h-4 w-4" strokeWidth={2} />
              {item.label}
            </button>
          ))}
        </div>
        
        <div className="mt-4 px-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
            JD
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium leading-none">John Doe</span>
            <span className="text-xs text-muted-foreground mt-1">Administrator</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
