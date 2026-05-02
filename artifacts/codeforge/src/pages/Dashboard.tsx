import { useGetDashboardStats, useGetDashboardActivity, useGetAgentMetrics } from "@workspace/api-client-react";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  GitBranch,
  Cpu,
  CheckCircle,
  ShieldAlert,
  Rocket,
  Code2,
  Activity,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

const activityIcons: Record<string, string> = {
  repo_connected: "text-blue-400",
  scan_complete: "text-emerald-400",
  agent_task: "text-violet-400",
  code_generated: "text-blue-400",
  security_alert: "text-red-400",
  deployment: "text-emerald-400",
  pr_created: "text-violet-400",
  test_run: "text-yellow-400",
};

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats();
  const { data: activity } = useGetDashboardActivity();
  const { data: metrics } = useGetAgentMetrics();

  return (
    <Layout>
      <PageHeader title="Dashboard" description="Mission control for all your agents and repositories" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={GitBranch} label="Repositories"
            value={stats?.totalRepositories ?? "—"}
            color="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            icon={Cpu} label="Active Agents"
            value={stats?.activeAgents ?? "—"}
            sub="running now"
            color="bg-violet-500/10 text-violet-400"
          />
          <StatCard
            icon={CheckCircle} label="Tasks Completed"
            value={stats?.tasksCompleted?.toLocaleString() ?? "—"}
            sub={`${stats?.tasksToday ?? 0} today`}
            color="bg-emerald-500/10 text-emerald-400"
          />
          <StatCard
            icon={ShieldAlert} label="Security Issues"
            value={stats?.securityIssues ?? "—"}
            sub={`${stats?.criticalIssues ?? 0} critical`}
            color="bg-red-500/10 text-red-400"
          />
          <StatCard
            icon={Rocket} label="Deployments"
            value={stats?.successfulDeployments ?? "—"}
            sub="successful"
            color="bg-orange-500/10 text-orange-400"
          />
          <StatCard
            icon={Code2} label="Lines Generated"
            value={stats?.linesGenerated?.toLocaleString() ?? "—"}
            color="bg-blue-500/10 text-blue-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Agent metrics chart */}
          <div className="lg:col-span-2 bg-card border border-card-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Agent Task Metrics (7 days)</h2>
            </div>
            {metrics && metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={metrics} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCoding" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResearch" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262 83% 68%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262 83% 68%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215 20% 50%)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(215 20% 50%)" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(217 32% 14%)", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "hsl(213 31% 91%)" }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "hsl(215 20% 50%)" }} />
                  <Area type="monotone" dataKey="coding" stroke="hsl(217 91% 60%)" fill="url(#colorCoding)" strokeWidth={2} />
                  <Area type="monotone" dataKey="research" stroke="hsl(262 83% 68%)" fill="url(#colorResearch)" strokeWidth={2} />
                  <Area type="monotone" dataKey="debug" stroke="hsl(142 76% 52%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="security" stroke="hsl(0 84% 60%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Loading metrics...</div>
            )}
          </div>

          {/* Activity feed */}
          <div className="bg-card border border-card-border rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3 overflow-y-auto max-h-[240px]">
              {activity && activity.length > 0 ? activity.slice(0, 12).map((event) => (
                <div key={event.id} className="flex gap-3 items-start" data-testid={`activity-${event.id}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${activityIcons[event.type] ?? "text-slate-400"} bg-current`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(event.createdAt).toLocaleTimeString()}</p>
                  </div>
                  {event.severity && <StatusBadge value={event.severity} className="flex-shrink-0" />}
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
