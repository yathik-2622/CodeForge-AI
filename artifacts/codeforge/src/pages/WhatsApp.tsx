import { useEffect, useState } from "react";
import { Layout, PageHeader } from "@/components/Layout";
import { MessageCircle, CheckCircle2, XCircle, Copy, ExternalLink, ChevronRight } from "lucide-react";

interface StatusData {
  configured: boolean;
  webhookUrl: string;
  instructions: string | string[];
}

export default function WhatsApp() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/whatsapp/status", { credentials: "include" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  function copyWebhook() {
    if (!status?.webhookUrl) return;
    navigator.clipboard.writeText(status.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const steps = [
    {
      n: 1,
      title: "Create a free Twilio account",
      desc: "Sign up at twilio.com — no credit card required for the sandbox.",
      link: "https://twilio.com",
      linkLabel: "Open Twilio",
    },
    {
      n: 2,
      title: "Enable WhatsApp Sandbox",
      desc: "Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message. Follow the instructions to join the sandbox.",
      link: "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn",
      linkLabel: "Open Twilio Console",
    },
    {
      n: 3,
      title: "Set the webhook URL",
      desc: "In Twilio Console → WhatsApp Sandbox Settings, set the incoming message webhook URL to:",
      webhook: true,
    },
    {
      n: 4,
      title: "Add environment variables",
      desc: "Add these to your server's environment secrets:",
      code: `TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`,
    },
    {
      n: 5,
      title: "Restart the server",
      desc: "After adding the env vars, restart your server. The status indicator above will turn green.",
    },
  ];

  const commands = [
    { cmd: "/start", desc: "Welcome message and feature overview" },
    { cmd: "/new", desc: "Start a fresh conversation" },
    { cmd: "/help", desc: "Show available commands" },
    { cmd: "/history", desc: "See your last few messages" },
    { cmd: "Any coding question", desc: "AI agent answers directly" },
    { cmd: "Fix this error: ...", desc: "Paste any error for a fix" },
    { cmd: "Search for ...", desc: "Triggers live web search" },
  ];

  return (
    <Layout>
      <PageHeader
        title="WhatsApp Integration"
        description="Control CodeForge AI from WhatsApp — build apps by sending a message"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-6">

          {/* Status Card */}
          <div className={`rounded-xl border p-5 flex items-start gap-4 ${
            status?.configured
              ? "border-green-500/30 bg-green-500/5"
              : "border-yellow-500/30 bg-yellow-500/5"
          }`}>
            {status?.configured
              ? <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              : <XCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">
                {status === null
                  ? "Checking status..."
                  : status.configured
                  ? "WhatsApp is active"
                  : "WhatsApp not configured yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {status?.configured
                  ? "Your Twilio credentials are set. Users can message your WhatsApp number to use the AI agent."
                  : "Follow the setup steps below to enable WhatsApp control of CodeForge AI."}
              </p>
            </div>
          </div>

          {/* Webhook URL */}
          {status?.webhookUrl && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Webhook URL
              </h2>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2.5 font-mono text-muted-foreground truncate">
                  {status.webhookUrl}
                </code>
                <button
                  onClick={copyWebhook}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Paste this URL in Twilio Console → WhatsApp Sandbox → Webhook URL</p>
            </div>
          )}

          {/* Setup Steps */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Setup Guide</h2>
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.n} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {step.n}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                    {step.webhook && status?.webhookUrl && (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-muted rounded px-2 py-1.5 font-mono text-muted-foreground truncate">
                          {status.webhookUrl}
                        </code>
                        <button onClick={copyWebhook} className="flex-shrink-0 p-1.5 rounded hover:bg-muted transition-colors">
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                    {step.code && (
                      <pre className="text-xs bg-muted rounded-lg px-3 py-2.5 font-mono text-muted-foreground overflow-x-auto">
                        {step.code}
                      </pre>
                    )}
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {step.linkLabel}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commands Reference */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">WhatsApp Commands</h2>
            <p className="text-xs text-muted-foreground">
              Once connected, users can send these messages to your Twilio WhatsApp number:
            </p>
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {commands.map((c) => (
                <div key={c.cmd} className="flex items-center gap-4 px-4 py-3 bg-muted/30">
                  <code className="text-xs font-mono text-primary w-40 flex-shrink-0">{c.cmd}</code>
                  <span className="text-xs text-muted-foreground">{c.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Example Conversation */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Example Conversation</h2>
            <div className="space-y-3">
              {[
                { from: "user", msg: "How do I implement rate limiting in Express?" },
                { from: "ai", msg: "Here's how to add rate limiting to Express:\n\n```js\nconst rateLimit = require('express-rate-limit');\n\nconst limiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 min\n  max: 100\n});\n\napp.use('/api/', limiter);\n```\n\nThis limits each IP to 100 requests per 15 minutes." },
                { from: "user", msg: "Search for best Express security middleware 2025" },
                { from: "ai", msg: "Based on my web search:\n\n• helmet — sets secure HTTP headers\n• express-rate-limit — rate limiting\n• cors — configures CORS properly\n• express-validator — input validation\n\nInstall all: npm i helmet cors express-rate-limit express-validator" },
              ].map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-xs ${
                    m.from === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {m.from === "ai" && (
                      <p className="font-semibold text-primary text-xs mb-1">⚡ CodeForge AI</p>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{m.msg}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your AI agent, accessible from any WhatsApp device
            </p>
          </div>

          {/* Docs Link */}
          <a
            href="/docs/user-guide.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Full User Guide</p>
              <p className="text-xs text-muted-foreground">Complete setup, CLI, VS Code extension, and WhatsApp documentation</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

        </div>
      </div>
    </Layout>
  );
}
