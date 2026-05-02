import { useState } from "react";
import { useListSecurityFindings, useGetSecuritySummary } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge, SeverityDot } from "@/components/StatusBadge";
import { Shield, AlertOctagon, AlertTriangle, AlertCircle, Info, Package, Key, Terminal, Bug, Lock } from "lucide-react";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;
const SEVERITY_LABELS = { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info" };
const SEVERITY_BG = {
  critical: "bg-red-500/10 border-red-500/20",
  high: "bg-orange-500/10 border-orange-500/20",
  medium: "bg-yellow-500/10 border-yellow-500/20",
  low: "bg-blue-500/10 border-blue-500/20",
  info: "bg-slate-500/10 border-slate-500/20",
};
const SEVERITY_ICONS = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
  info: Info,
};
const SEVERITY_TEXT = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
  info: "text-slate-400",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  secret_leak: Key,
  prompt_injection: Terminal,
  malicious_package: Package,
  destructive_command: Terminal,
  vulnerability: Bug,
  dependency: Lock,
};

export default function Security() {
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const summary = useGetSecuritySummary();
  const findings = useListSecurityFindings(filterSeverity ? { severity: filterSeverity as any } : {});

  return (
    <Layout>
      <PageHeader title="Security Dashboard" description="Findings across all repositories" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {SEVERITY_ORDER.map((sev) => {
            const Icon = SEVERITY_ICONS[sev];
            const count = summary?.[sev] ?? 0;
            const active = filterSeverity === sev;
            return (
              <button
                key={sev}
                className={`text-left p-3 rounded-lg border transition-all ${SEVERITY_BG[sev]} ${active ? "ring-1 ring-inset ring-current" : ""}`}
                onClick={() => setFilterSeverity(active ? null : sev)}
                data-testid={`filter-${sev}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`w-4 h-4 ${SEVERITY_TEXT[sev]}`} />
                  {active && <span className="text-xs text-muted-foreground">active</span>}
                </div>
                <p className={`text-2xl font-bold ${SEVERITY_TEXT[sev]}`}>{count}</p>
                <p className="text-xs text-muted-foreground">{SEVERITY_LABELS[sev]}</p>
              </button>
            );
          })}
        </div>

        {/* Summary stats */}
        {summary && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              {summary.resolved} resolved
            </span>
            <span>{summary.total} total findings</span>
            {filterSeverity && (
              <button className="text-primary text-xs hover:underline" onClick={() => setFilterSeverity(null)}>
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* Findings list */}
        <div className="space-y-2">
          {(!findings || findings.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No findings</p>
            </div>
          )}
          {findings?.map((f) => {
            const CategoryIcon = CATEGORY_ICONS[f.category] ?? Shield;
            return (
              <div key={f.id} className="bg-card border border-card-border rounded-lg p-4 flex gap-3" data-testid={`finding-${f.id}`}>
                <SeverityDot severity={f.severity as any} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{f.title}</p>
                    <StatusBadge value={f.severity} />
                    <StatusBadge value={f.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CategoryIcon className="w-3 h-3" />
                      {f.category.replace(/_/g, " ")}
                    </span>
                    {f.file && (
                      <span className="text-xs font-mono text-muted-foreground">{f.file}{f.line ? `:${f.line}` : ""}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{new Date(f.detectedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
