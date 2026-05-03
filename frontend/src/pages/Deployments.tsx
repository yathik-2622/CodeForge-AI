import { useListDeployments } from "../lib/api";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Rocket, GitBranch, GitCommit, User, Clock } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  azure: "Azure",
  aws: "AWS",
  gcp: "GCP",
  docker: "Docker",
  kubernetes: "Kubernetes",
};
const ENV_COLORS: Record<string, string> = {
  production: "text-red-400 bg-red-500/10 border-red-500/20",
  staging: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  development: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

export default function Deployments() {
  const { data: deployments } = useListDeployments();
  const sorted = [...(deployments ?? [])].reverse();

  return (
    <Layout>
      <PageHeader title="Deployments" description={`${deployments?.length ?? 0} total`} />
      <div className="flex-1 overflow-y-auto p-6">
        {sorted.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Rocket className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No deployments yet</p>
          </div>
        )}
        <div className="space-y-2">
          {sorted.map((dep) => (
            <div key={dep.id} className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-4" data-testid={`deployment-${dep.id}`}>
              <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Rocket className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${ENV_COLORS[dep.environment] ?? ""}`}>
                    {dep.environment}
                  </span>
                  <span className="text-sm font-medium text-foreground">{PLATFORM_LABELS[dep.platform] ?? dep.platform}</span>
                  <StatusBadge value={dep.status} />
                </div>
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <GitBranch className="w-3 h-3" /> {dep.branch}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <GitCommit className="w-3 h-3" /> {dep.commitHash.slice(0, 8)}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> {dep.deployedBy}
                  </span>
                  {dep.durationMs && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {(dep.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-mono text-muted-foreground">{dep.version}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(dep.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
