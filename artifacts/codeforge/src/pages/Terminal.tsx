import { useState } from "react";
import { useListExecutions, useCreateExecution, getListExecutionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Terminal as TerminalIcon, Play, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Loader, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ExecutionRow({ exec }: { exec: any }) {
  const [expanded, setExpanded] = useState(false);
  const statusIcons: Record<string, React.ReactNode> = {
    success: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
    error: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
    blocked: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
    running: <Loader className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
    queued: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  };
  return (
    <div className="border border-card-border rounded-lg overflow-hidden" data-testid={`execution-${exec.id}`}>
      <button
        className="w-full flex items-center gap-3 p-3 bg-card hover:bg-card/80 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {statusIcons[exec.status] ?? <div className="w-3.5 h-3.5" />}
        <span className="text-xs font-mono text-foreground flex-1 truncate">{exec.command}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge value={exec.status} />
          {exec.durationMs && <span className="text-xs text-muted-foreground">{exec.durationMs}ms</span>}
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>
      {expanded && exec.output && (
        <div className="border-t border-card-border bg-background p-3">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">{exec.output}</pre>
        </div>
      )}
    </div>
  );
}

export default function Terminal() {
  const [command, setCommand] = useState("");
  const { data: executions } = useListExecutions();
  const create = useCreateExecution();
  const qc = useQueryClient();

  const handleRun = () => {
    if (!command.trim()) return;
    create.mutate({ data: { command } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListExecutionsQueryKey() });
        setCommand("");
        setTimeout(() => qc.invalidateQueries({ queryKey: getListExecutionsQueryKey() }), 2200);
      },
    });
  };

  const sorted = [...(executions ?? [])].reverse();

  return (
    <Layout>
      <PageHeader
        title="Terminal"
        description="Sandboxed command execution"
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Command input */}
        <div className="bg-card border border-card-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TerminalIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Run Command</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-background border border-input rounded-md px-3 font-mono text-sm">
              <span className="text-primary select-none">$</span>
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRun()}
                placeholder="npm install, pytest, docker build..."
                className="border-0 bg-transparent px-0 h-9 font-mono text-sm focus-visible:ring-0"
                data-testid="input-command"
              />
            </div>
            <Button onClick={handleRun} disabled={create.isPending || !command.trim()} size="sm" data-testid="button-run">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Run
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Destructive commands (rm -rf, DROP TABLE, etc.) are automatically blocked for safety.</p>
        </div>

        {/* Executions */}
        <div className="space-y-2">
          {sorted.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <TerminalIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No executions yet</p>
            </div>
          )}
          {sorted.map((exec) => <ExecutionRow key={exec.id} exec={exec} />)}
        </div>
      </div>
    </Layout>
  );
}
