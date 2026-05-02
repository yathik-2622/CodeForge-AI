import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import {
  useGetRepository,
  getGetRepositoryQueryKey,
  useGetRepositoryGraph,
  getGetRepositoryGraphQueryKey,
  useScanRepository,
  useListSecurityFindings,
  useListDeployments,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { SiGithub, SiGitlab, SiBitbucket } from "react-icons/si";
import { GitBranch, Scan, FileCode2, AlignLeft, Database, Globe, Cpu, GitCommit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NODE_COLORS: Record<string, string> = {
  function: "#3b82f6",
  class: "#8b5cf6",
  api: "#10b981",
  service: "#f59e0b",
  database: "#ef4444",
  file: "#64748b",
};

function GraphViz({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600;
  const H = 380;
  const cols = 5;
  const positioned = nodes.map((n, i) => ({
    ...n,
    x: 80 + (i % cols) * 110,
    y: 60 + Math.floor(i / cols) * 100,
  }));
  const pos = Object.fromEntries(positioned.map((n) => [n.id, n]));

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 300 }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="hsl(215 20% 40%)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const s = pos[e.source];
          const t = pos[e.target];
          if (!s || !t) return null;
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke="hsl(217 32% 20%)"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
              strokeDasharray={e.relation === "imports" ? "4 2" : undefined}
            />
          );
        })}
        {positioned.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={22} fill={NODE_COLORS[n.type] ?? "#64748b"} fillOpacity={0.15} stroke={NODE_COLORS[n.type] ?? "#64748b"} strokeWidth={1.5} />
            <text x={n.x} y={n.y - 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="white" fontFamily="JetBrains Mono, monospace">{n.type[0].toUpperCase()}</text>
            <text x={n.x} y={n.y + 30} textAnchor="middle" fontSize={9} fill="hsl(213 31% 75%)" fontFamily="Inter, sans-serif">{n.label.slice(0, 14)}</text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 mt-3 px-2">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-muted-foreground capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RepositoryDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const repo = useGetRepository(id, { query: { enabled: !!id, queryKey: getGetRepositoryQueryKey(id) } });
  const graph = useGetRepositoryGraph(id, { query: { enabled: !!id, queryKey: getGetRepositoryGraphQueryKey(id) } });
  const scan = useScanRepository();
  const findings = useListSecurityFindings({ repositoryId: id });
  const deployments = useListDeployments();

  const repoDeployments = deployments?.filter((d) => d.repositoryId === id) ?? [];
  const repoFindings = findings ?? [];

  const handleScan = () => {
    scan.mutate({ id }, {
      onSuccess: () => {
        setTimeout(() => qc.invalidateQueries({ queryKey: getGetRepositoryQueryKey(id) }), 3500);
      },
    });
  };

  if (!repo) {
    return (
      <Layout>
        <PageHeader title="Repository" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={repo.fullName}
        description={repo.description || repo.url}
        action={
          <Button size="sm" variant="outline" onClick={handleScan} disabled={scan.isPending || repo.status === "scanning"} data-testid="button-scan">
            <Scan className="w-3.5 h-3.5 mr-1.5" />
            {repo.status === "scanning" ? "Scanning..." : "Scan"}
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Meta strip */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-card border border-card-border rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <FileCode2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{repo.fileCount.toLocaleString()} files</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlignLeft className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{repo.lineCount.toLocaleString()} lines</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{repo.language || "Unknown"}</span>
          </div>
          <StatusBadge value={repo.status} />
          {repo.lastScannedAt && (
            <span className="text-xs text-muted-foreground">Last scanned {new Date(repo.lastScannedAt).toLocaleString()}</span>
          )}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="graph">Code Graph</TabsTrigger>
            <TabsTrigger value="security">Security ({repoFindings.length})</TabsTrigger>
            <TabsTrigger value="deployments">Deployments ({repoDeployments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-card-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Frameworks</h3>
                <div className="flex flex-wrap gap-2">
                  {repo.frameworks?.length ? repo.frameworks.map((fw) => (
                    <span key={fw} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono">{fw}</span>
                  )) : <span className="text-xs text-muted-foreground">None detected</span>}
                </div>
              </div>
              <div className="bg-card border border-card-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Database className="w-3 h-3" /> Databases
                </h3>
                <div className="flex flex-wrap gap-2">
                  {repo.databases?.length ? repo.databases.map((db) => (
                    <span key={db} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono">{db}</span>
                  )) : <span className="text-xs text-muted-foreground">None detected</span>}
                </div>
              </div>
              <div className="bg-card border border-card-border rounded-lg p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> APIs
                </h3>
                <div className="flex flex-wrap gap-2">
                  {repo.apis?.length ? repo.apis.map((api) => (
                    <span key={api} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono">{api}</span>
                  )) : <span className="text-xs text-muted-foreground">None detected</span>}
                </div>
              </div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <GitCommit className="w-3 h-3" /> Branches
              </h3>
              <div className="flex flex-wrap gap-2">
                {repo.branches?.map((b) => (
                  <span key={b} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono">{b}</span>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="graph">
            <div className="bg-card border border-card-border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-4">Code Knowledge Graph</h3>
              {graph ? (
                <GraphViz nodes={graph.nodes} edges={graph.edges} />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading graph...</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-2">
              {repoFindings.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No security findings for this repository</div>}
              {repoFindings.map((f) => (
                <div key={f.id} className="bg-card border border-card-border rounded-lg p-4 flex gap-3" data-testid={`finding-${f.id}`}>
                  <StatusBadge value={f.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                    {f.file && <p className="text-xs font-mono text-muted-foreground mt-1">{f.file}{f.line ? `:${f.line}` : ""}</p>}
                  </div>
                  <StatusBadge value={f.status} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="deployments">
            <div className="space-y-2">
              {repoDeployments.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No deployments yet</div>}
              {repoDeployments.map((d) => (
                <div key={d.id} className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-4" data-testid={`deployment-${d.id}`}>
                  <StatusBadge value={d.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.environment} — {d.platform}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{d.branch} @ {d.commitHash.slice(0, 8)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
