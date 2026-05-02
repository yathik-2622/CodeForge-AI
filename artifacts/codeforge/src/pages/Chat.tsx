import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import {
  useGetSession,
  getGetSessionQueryKey,
  useListMessages,
  getListMessagesQueryKey,
  useSendMessage,
  useListAgents,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Send, User, Bot, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const AGENT_COLORS: Record<string, string> = {
  planner: "text-violet-400",
  repository: "text-blue-400",
  research: "text-cyan-400",
  coding: "text-emerald-400",
  debug: "text-yellow-400",
  security: "text-red-400",
  review: "text-orange-400",
  deployment: "text-pink-400",
};

function MessageBubble({ msg }: { msg: any }) {
  const isUser = msg.role === "user";
  const isAgent = msg.role === "agent";
  const isSystem = msg.role === "system";

  if (isSystem) {
    return (
      <div className="text-center my-3">
        <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`} data-testid={`message-${msg.id}`}>
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${isUser ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : isAgent ? <Zap className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
      </div>
      <div className={`max-w-[70%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {isAgent && msg.agentType && (
          <span className={`text-xs font-semibold uppercase tracking-wide ${AGENT_COLORS[msg.agentType] ?? "text-muted-foreground"}`}>
            {msg.agentType} agent
          </span>
        )}
        <div className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : isAgent
            ? "bg-card border border-card-border rounded-tl-sm"
            : "bg-card border border-card-border rounded-tl-sm"
        }`}>
          <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        </div>
        <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

export default function Chat() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: session } = useGetSession(id, { query: { enabled: !!id, queryKey: getGetSessionQueryKey(id) } });
  const { data: messages } = useListMessages(id, { query: { enabled: !!id, queryKey: getListMessagesQueryKey(id) } });
  const { data: agents } = useListAgents();
  const send = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: getListMessagesQueryKey(id) });
    }, 2000);
    return () => clearInterval(interval);
  }, [id, qc]);

  const handleSend = () => {
    if (!input.trim() || !id) return;
    send.mutate({ id, data: { content: input } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMessagesQueryKey(id) });
        setInput("");
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <PageHeader
        title={session?.title ?? "Loading..."}
        description={session?.model}
        action={session && <StatusBadge value={session.status} />}
      />
      <div className="flex-1 overflow-hidden flex">
        {/* Messages panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(!messages || messages.length === 0) && (
              <div className="text-center py-16 text-muted-foreground">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Ask the agent to analyze your code, refactor a module, or fix a bug</p>
              </div>
            )}
            {messages?.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-3 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the agent to refactor, debug, explain, or build... (Enter to send)"
                className="flex-1 resize-none min-h-[60px] max-h-[160px] font-mono text-sm"
                rows={2}
                data-testid="input-message"
              />
              <Button
                onClick={handleSend}
                disabled={send.isPending || !input.trim()}
                size="sm"
                className="h-[60px] px-4"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Agent status panel */}
        <div className="w-64 border-l border-border flex flex-col flex-shrink-0">
          <div className="h-10 border-b border-border flex items-center px-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agents</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {agents?.map((agent) => (
              <div key={agent.id} className="p-2.5 bg-card border border-card-border rounded-lg" data-testid={`agent-${agent.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Cpu className={`w-3 h-3 flex-shrink-0 ${AGENT_COLORS[agent.type] ?? "text-muted-foreground"}`} />
                    <span className="text-xs font-medium capitalize">{agent.type}</span>
                  </div>
                  <StatusBadge value={agent.status} />
                </div>
                {agent.currentTask && (
                  <p className="text-xs text-muted-foreground mt-1.5 truncate">{agent.currentTask}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{agent.tasksCompleted} tasks done</p>
              </div>
            ))}
            {(!agents || agents.length === 0) && (
              <p className="text-xs text-muted-foreground p-2">No agents active</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
