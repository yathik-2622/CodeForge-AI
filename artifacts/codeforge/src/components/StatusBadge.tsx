import { cn } from "@/lib/utils";

type Severity = "critical" | "high" | "medium" | "low" | "info";
type Status = string;

const severityColors: Record<Severity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  info: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const statusColors: Record<string, string> = {
  ready: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  complete: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  active: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  running: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  deploying: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  building: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  scanning: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  waiting: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  queued: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  connected: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  idle: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  blocked: "bg-red-500/15 text-red-400 border-red-500/30",
  open: "bg-red-500/15 text-red-400 border-red-500/30",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  dismissed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  rolled_back: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  completed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const colorClass = statusColors[value] ?? severityColors[value as Severity] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", colorClass, className)}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  const colors: Record<Severity, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
    info: "bg-slate-500",
  };
  return <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", colors[severity])} />;
}
