import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  GitBranch,
  MessageSquare,
  Terminal,
  Shield,
  Rocket,
  Zap,
  ChevronRight,
} from "lucide-react";

const nav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: GitBranch, label: "Repositories", path: "/repositories" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Terminal, label: "Terminal", path: "/terminal" },
  { icon: Shield, label: "Security", path: "/security" },
  { icon: Rocket, label: "Deployments", path: "/deployments" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">
              CodeForge <span className="text-gradient-blue">AI</span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {nav.map(({ icon: Icon, label, path }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 rounded-md bg-sidebar-accent">
            <p className="text-xs text-muted-foreground font-mono">v0.1.0-beta</p>
            <p className="text-xs text-muted-foreground mt-0.5">8 agents ready</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="h-14 border-b border-border flex items-center px-6 flex-shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}
