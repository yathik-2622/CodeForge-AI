import { useState } from "react";
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
  ChevronLeft,
  LogOut,
  LogIn,
  Globe,
  MessageCircle,
  Instagram,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

// Navigation items — add new pages here
const nav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: GitBranch, label: "Repositories", path: "/repositories" },
  { icon: MessageSquare, label: "Chat", path: "/chat" },
  { icon: Terminal, label: "Terminal", path: "/terminal" },
  { icon: Shield, label: "Security", path: "/security" },
  { icon: Rocket, label: "Deployments", path: "/deployments" },
  { icon: MessageCircle, label: "WhatsApp", path: "/whatsapp" },
  { icon: Instagram, label: "Instagram", path: "/instagram" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  // Collapsed state: sidebar shows only icons when collapsed
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className={`
          flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col
          transition-all duration-200 ease-in-out
          ${collapsed ? "w-14" : "w-56"}
        `}
      >
        {/* Logo + collapse toggle */}
        <div className="h-14 flex items-center px-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-md flex-shrink-0">
              <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            {/* Hide text label when collapsed */}
            {!collapsed && (
              <span className="font-semibold text-sm tracking-tight text-foreground truncate">
                CodeForge <span className="text-primary">AI</span>
              </span>
            )}
          </div>
          {/* Toggle button */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors flex-shrink-0 ml-auto"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
              : <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
            }
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 py-3 px-1.5 space-y-0.5 overflow-y-auto">
          {nav.map(({ icon: Icon, label, path }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                className={`
                  flex items-center gap-2.5 rounded-md text-sm font-medium
                  transition-colors group relative
                  ${collapsed ? "px-2 py-2 justify-center" : "px-3 py-2"}
                  ${active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }
                `}
                data-testid={`nav-${label.toLowerCase()}`}
                title={collapsed ? label : undefined}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                />
                {/* Hide labels when collapsed */}
                {!collapsed && (
                  <>
                    <span className="truncate">{label}</span>
                    {active && <ChevronRight className="w-3 h-3 ml-auto text-primary flex-shrink-0" />}
                  </>
                )}

                {/* Tooltip on hover when collapsed */}
                {collapsed && (
                  <div className="
                    absolute left-full ml-2 px-2 py-1 bg-popover border border-border
                    rounded-md text-xs text-popover-foreground whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity z-50 shadow-md
                  ">
                    {label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info + version at bottom */}
        <div className={`p-2 border-t border-sidebar-border space-y-1.5 ${collapsed ? "px-1.5" : "p-3"}`}>
          {user ? (
            <div className={`rounded-md bg-sidebar-accent flex items-center gap-2 ${collapsed ? "p-2 justify-center" : "px-3 py-2"}`}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.login}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  title={collapsed ? user.login : undefined}
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                  title={collapsed ? user.login : undefined}
                >
                  <span className="text-xs font-bold text-primary-foreground">
                    {user.login[0].toUpperCase()}
                  </span>
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{user.login}</p>
                    <p className="text-xs text-muted-foreground truncate">GitHub</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1 rounded hover:bg-sidebar-border transition-colors flex-shrink-0"
                    title="Sign out"
                  >
                    <LogOut className="w-3 h-3 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <a
              href="/api/auth/github"
              className={`
                flex items-center rounded-md bg-sidebar-accent text-xs
                text-muted-foreground hover:text-foreground transition-colors
                ${collapsed ? "p-2 justify-center" : "gap-2 px-3 py-2"}
              `}
              title={collapsed ? "Sign in with GitHub" : undefined}
            >
              <LogIn className="w-3.5 h-3.5 flex-shrink-0" />
              {!collapsed && "Sign in with GitHub"}
            </a>
          )}

          {!collapsed && (
            <div className="px-3 py-1.5 rounded-md bg-sidebar-accent/50">
              <p className="text-xs text-muted-foreground font-mono">v1.0.0</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" />
                {user ? "Connected to GitHub" : "Demo mode"}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ title, description, action }: {
  title: string; description?: string; action?: React.ReactNode;
}) {
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
