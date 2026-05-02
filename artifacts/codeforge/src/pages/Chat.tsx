import { useState, useEffect, useRef, useCallback } from "react";
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
import { Send, User, Bot, Cpu, Zap, Globe, Loader2, Copy, Check } from "lucide-react";
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2 right-2 p-1.5 rounded bg-secondary hover:bg-secondary/80 transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
    </button>
  );
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0] ?? "";
      const code = lines.slice(1).join("\n");
      return (
        <div key={i} className="relative group my-3">
          {lang && <div className="text-xs text-muted-foreground font-mono bg-secondary px-3 py-1 rounded-t-md border border-border border-b-0">{lang}</div>}
          <pre className={`bg-[hsl(222_47%_5%)] border border-border p-3 text-xs font-mono overflow-x-auto leading-relaxed ${lang ? "rounded-b-md" : "rounded-md"}`}>
            <code>{code}</code>
          </pre>
          <CopyButton text={code} />
        </div>
      );
    }
    return <span key={i} className="whitespace-pre-wrap leading-relaxed">{part}</span>;
  });
}

function MessageBubble({ msg, isStreaming }: { msg: any; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
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
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${isUser ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 text-primary" />}
      </div>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && msg.agentType && (
          <span className={`text-xs font-semibold uppercase tracking-wide ${AGENT_COLORS[msg.agentType] ?? "text-muted-foreground"}`}>
            {msg.agentType} agent
          </span>
        )}
        <div className={`px-4 py-3 rounded-xl text-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-card-border rounded-tl-sm"
        }`}>
          {isUser ? <span className="whitespace-pre-wrap">{msg.content}</span> : renderContent(msg.content)}
          {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 rounded-sm" />}
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: session } = useGetSession(id, { query: { enabled: !!id, queryKey: getGetSessionQueryKey(id) } });
  const { data: messages, refetch: refetchMessages } = useListMessages(id, { query: { enabled: !!id, queryKey: getListMessagesQueryKey(id) } });
  const { data: agents } = useListAgents();
  const send = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, streamingContent]);

  const startStream = useCallback(async () => {
    if (!id) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/sessions/${id}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: ctrl.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) setStreamingContent((p) => p + data.token);
              if (data.messageId || line.includes('"done"')) {
                await refetchMessages();
                setStreamingContent("");
                setIsStreaming(false);
              }
            } catch { }
          }
          if (line.startsWith("event: done") || line.startsWith("event: error")) {
            await refetchMessages();
            setStreamingContent("");
            setIsStreaming(false);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        await refetchMessages();
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, [id, refetchMessages]);

  const handleSend = async () => {
    if (!input.trim() || !id || isStreaming) return;
    const content = input;
    setInput("");

    send.mutate({ id, data: { content } }, {
      onSuccess: async () => {
        await refetchMessages();
        startStream();
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const streamingMsg = streamingContent ? {
    id: "__streaming__",
    role: "agent",
    content: streamingContent,
    agentType: "coding",
    createdAt: new Date().toISOString(),
  } : null;

  return (
    <Layout>
      <PageHeader
        title={session?.title ?? "Loading..."}
        description={session?.model}
        action={session && <StatusBadge value={session.status} />}
      />
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(!messages || messages.length === 0) && !isStreaming && (
              <div className="text-center py-16 text-muted-foreground">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Start a conversation</p>
                <p className="text-xs mt-1">Ask the agent to analyze your code, fix bugs, or explain concepts</p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
                  {[
                    "Explain how this repo is structured",
                    "Find and fix all TypeScript errors",
                    "Search for best practices for JWT auth",
                    "Generate unit tests for the auth module",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="text-left text-xs bg-card border border-card-border px-3 py-2 rounded-lg hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages?.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            {streamingMsg && <MessageBubble msg={streamingMsg} isStreaming />}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-4">
            <div className="flex gap-3 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the agent to refactor, debug, explain, or build... (Enter to send, Shift+Enter for newline)"
                className="flex-1 resize-none min-h-[60px] max-h-[160px] font-mono text-sm"
                rows={2}
                disabled={isStreaming}
                data-testid="input-message"
              />
              <Button
                onClick={handleSend}
                disabled={send.isPending || !input.trim() || isStreaming}
                size="sm"
                className="h-[60px] px-4"
                data-testid="button-send"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {isStreaming && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Agent is thinking...
              </p>
            )}
          </div>
        </div>

        <div className="w-60 border-l border-border flex flex-col flex-shrink-0">
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
                  <StatusBadge value={isStreaming && agent.type === "coding" ? "running" : agent.status} />
                </div>
                {agent.currentTask && (
                  <p className="text-xs text-muted-foreground mt-1.5 truncate">{agent.currentTask}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{agent.tasksCompleted} tasks</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
