import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetSession,
  getGetSessionQueryKey,
  useListMessages,
  getListMessagesQueryKey,
  useSendMessage,
  useListAgents,
} from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Send, User, Bot, Cpu, Zap, Globe, Loader2,
  Copy, Check, Share2, Users, Link, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSessionSocket, type Participant, type SessionSocketState } from "@/hooks/useSessionSocket";

const AGENT_COLORS: Record<string, string> = {
  planner: "text-violet-400", repository: "text-blue-400", research: "text-cyan-400",
  coding: "text-emerald-400", debug: "text-yellow-400", security: "text-red-400",
  review: "text-orange-400", deployment: "text-pink-400",
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
          isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-card-border rounded-tl-sm"
        }`}>
          {isUser ? <span className="whitespace-pre-wrap">{msg.content}</span> : renderContent(msg.content)}
          {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 rounded-sm" />}
        </div>
        <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function ParticipantDot({ p, isMe }: { p: Participant; isMe: boolean }) {
  return (
    <div className="relative group">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-background"
        style={{ backgroundColor: p.color }}
        title={p.name + (isMe ? " (you)" : "")}
      >
        {p.name[0]}
      </div>
    </div>
  );
}

function ShareModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${window.location.pathname}`;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Share Session</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-secondary rounded-lg p-3 mb-4">
          <Link className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{url}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            Real-time sync active
          </p>
        </div>
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
  const [showShare, setShowShare] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [wsState, setWsState] = useState<SessionSocketState>({
    connected: false, me: null, participants: [], streamingToken: "", isRemoteStreaming: false,
  });

  const handleWsUpdate = useCallback((state: SessionSocketState) => {
    setWsState({ ...state });
    if (!state.isRemoteStreaming && state.streamingToken === "") {
      qc.invalidateQueries({ queryKey: getListMessagesQueryKey(id ?? "") });
    }
  }, [id, qc]);

  useSessionSocket(id, handleWsUpdate);

  const { data: session }                        = useGetSession(id);
  const { data: messages, refetch: refetchMessages } = useListMessages(id);
  const { data: agents }                         = useListAgents();
  const send                                     = useSendMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, streamingContent, wsState.streamingToken]);

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
      if (!response.ok || !response.body) throw new Error(`Stream error ${response.status}`);
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
      if (err.name !== "AbortError") await refetchMessages();
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
      onSuccess: async () => { await refetchMessages(); startStream(); },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const streamingMsg = streamingContent ? {
    id: "__streaming__", role: "agent", content: streamingContent,
    agentType: "coding", createdAt: new Date().toISOString(),
  } : null;

  const remoteStreamingMsg = wsState.isRemoteStreaming && !isStreaming && wsState.streamingToken ? {
    id: "__remote_streaming__", role: "agent", content: wsState.streamingToken,
    agentType: "coding", createdAt: new Date().toISOString(),
  } : null;

  const otherParticipants = wsState.participants.filter((p) => p.id !== wsState.me?.id);

  return (
    <Layout>
      <PageHeader
        title={session?.title ?? "Loading..."}
        description={session?.model}
        action={
          <div className="flex items-center gap-2">
            {wsState.connected && wsState.participants.length > 0 && (
              <div className="flex items-center gap-1.5 mr-1">
                <div className="flex -space-x-1.5">
                  {wsState.participants.slice(0, 5).map((p) => (
                    <ParticipantDot key={p.id} p={p} isMe={p.id === wsState.me?.id} />
                  ))}
                </div>
                {wsState.participants.length > 1 && (
                  <span className="text-xs text-muted-foreground ml-1">{wsState.participants.length} live</span>
                )}
              </div>
            )}
            {session && <StatusBadge value={session.status} />}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowShare(true)}>
              <Share2 className="w-3 h-3" /> Share
            </Button>
          </div>
        }
      />

      {showShare && id && <ShareModal sessionId={id} onClose={() => setShowShare(false)} />}

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(!messages || messages.length === 0) && !isStreaming && !wsState.isRemoteStreaming && (
              <div className="text-center py-16 text-muted-foreground">
                <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Start a conversation</p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
                  {["Explain how this repo is structured","Find and fix all TypeScript errors","Search for best practices for JWT auth","Generate unit tests for the auth module"].map((prompt) => (
                    <button key={prompt} onClick={() => setInput(prompt)} className="text-left text-xs bg-card border border-card-border px-3 py-2 rounded-lg hover:border-primary/50 hover:text-primary transition-colors">{prompt}</button>
                  ))}
                </div>
              </div>
            )}
            {messages?.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            {streamingMsg && <MessageBubble msg={streamingMsg} isStreaming />}
            {remoteStreamingMsg && <MessageBubble msg={remoteStreamingMsg} isStreaming />}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-4">
            {otherParticipants.length > 0 && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex -space-x-1">
                  {otherParticipants.slice(0, 3).map((p) => (
                    <div key={p.id} className="w-4 h-4 rounded-full ring-1 ring-background" style={{ backgroundColor: p.color }} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {otherParticipants.map((p) => p.name).join(", ")} {otherParticipants.length === 1 ? "is" : "are"} in this session
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}
            <div className="flex gap-3 items-end">
              <Textarea
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask the agent to refactor, debug, explain, or build... (Enter to send, Shift+Enter for newline)"
                className="flex-1 resize-none min-h-[60px] max-h-[160px] font-mono text-sm" rows={2}
                disabled={isStreaming} data-testid="input-message"
              />
              <Button onClick={handleSend} disabled={send.isPending || !input.trim() || isStreaming} size="sm" className="h-[60px] px-4" data-testid="button-send">
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {(isStreaming || wsState.isRemoteStreaming) && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Agent is thinking...
              </p>
            )}
          </div>
        </div>

        <div className="w-60 border-l border-border flex flex-col flex-shrink-0">
          {wsState.connected && wsState.participants.length > 1 && (
            <div className="border-b border-border">
              <div className="h-9 flex items-center px-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Collaborators
                </span>
              </div>
              <div className="px-3 pb-3 space-y-1.5">
                {wsState.participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: p.color }}>{p.name[0]}</div>
                    <span className="text-xs text-foreground">{p.name}</span>
                    {p.id === wsState.me?.id && <span className="text-xs text-muted-foreground ml-auto">(you)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
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
                  <StatusBadge value={(isStreaming || wsState.isRemoteStreaming) && agent.type === "coding" ? "running" : agent.status} />
                </div>
                {agent.currentTask && <p className="text-xs text-muted-foreground mt-1.5 truncate">{agent.currentTask}</p>}
                <p className="text-xs text-muted-foreground mt-1">{agent.tasksCompleted} tasks</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
