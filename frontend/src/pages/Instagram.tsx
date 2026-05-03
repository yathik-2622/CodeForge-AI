import { Layout, PageHeader } from "@/components/Layout";
import { Instagram as InstagramIcon, ExternalLink, CheckCircle, AlertCircle, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";

// Step-by-step setup instructions for Instagram DM integration
const SETUP_STEPS = [
  {
    step: 1,
    title: "Ensure you have an Instagram Business or Creator account",
    description:
      "Personal accounts cannot use the Instagram Messaging API. Convert at: Instagram Settings → Account → Switch to Professional Account.",
    link: "https://www.instagram.com/accounts/convert_to_business/",
    linkLabel: "Convert to Business",
  },
  {
    step: 2,
    title: "Connect Instagram to a Facebook Page",
    description:
      "Required by Meta. Go to your Facebook Page → Settings → Instagram → Connect Account.",
    link: "https://www.facebook.com/business/instagram",
    linkLabel: "Open Facebook Business",
  },
  {
    step: 3,
    title: "Create a free Twilio account",
    description:
      "Twilio handles the Instagram API integration. Sign up for free — you get $15 free credit.",
    link: "https://www.twilio.com/try-twilio",
    linkLabel: "Sign up for Twilio",
  },
  {
    step: 4,
    title: "Enable Instagram channel in Twilio",
    description:
      "In the Twilio Console → Messaging → Channels → Instagram DM. Follow the setup wizard to connect your Instagram account.",
    link: "https://console.twilio.com/",
    linkLabel: "Open Twilio Console",
  },
  {
    step: 5,
    title: "Set your webhook URL in Twilio",
    description:
      "In Twilio's Instagram channel settings, set the webhook URL to the one shown below.",
  },
  {
    step: 6,
    title: "Add environment variables and restart",
    description:
      "Copy the values from Twilio's Console → Account Info and add them to your backend .env file. Then restart the Python backend.",
  },
];

// Environment variables needed for Instagram integration
const ENV_VARS = [
  {
    name: "TWILIO_ACCOUNT_SID",
    description: "Found in Twilio Console → Account Info",
    example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    name: "TWILIO_AUTH_TOKEN",
    description: "Found in Twilio Console → Account Info",
    example: "your_auth_token",
  },
  {
    name: "TWILIO_INSTAGRAM_FROM",
    description: "Your Instagram sender ID from Twilio",
    example: "instagram:your-page-id",
  },
];

// Commands users can DM to the bot
const DM_COMMANDS = [
  { command: "hi / hello", description: "Show welcome message and capabilities" },
  { command: "/help", description: "List all available commands" },
  { command: "/new", description: "Start a fresh conversation" },
  { command: "Any coding question", description: "AI responds with code, explanations, etc." },
];

export default function Instagram() {
  const [copiedEnv, setCopiedEnv] = useState<string | null>(null);

  // Backend URL for the webhook — in production this should be the deployed URL
  const backendUrl = window.location.origin.replace(/:5173$/, ":9000");
  const webhookUrl = `${backendUrl}/api/instagram/webhook`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedEnv(key);
      setTimeout(() => setCopiedEnv(null), 2000);
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Instagram Integration"
        description="Chat with CodeForge AI through Instagram Direct Messages"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Status banner ────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-sidebar p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Instagram integration requires setup</p>
            <p className="text-xs text-muted-foreground mt-1">
              You need a Twilio account and an Instagram Business account. Follow the steps below — it takes about 15 minutes.
            </p>
          </div>
        </div>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-sidebar p-5">
          <div className="flex items-center gap-2 mb-4">
            <InstagramIcon className="w-5 h-5 text-pink-500" />
            <h2 className="text-sm font-semibold text-foreground">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: MessageCircle, title: "User sends a DM", desc: "Someone sends a direct message to your Instagram Business account" },
              { icon: InstagramIcon, title: "Twilio receives it", desc: "Twilio forwards the message to your CodeForge AI backend webhook" },
              { icon: CheckCircle, title: "AI responds", desc: "CodeForge AI generates a response and sends it back as a DM" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-background rounded-md p-4 border border-border">
                <Icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Webhook URL ───────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-sidebar p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Webhook URL</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Paste this URL in Twilio's Instagram channel settings under "A message comes in":
          </p>
          <div className="flex items-center gap-2 bg-background rounded-md border border-border p-3">
            <code className="text-xs font-mono text-primary flex-1 break-all">{webhookUrl}</code>
            <button
              onClick={() => copyToClipboard(webhookUrl, "webhook")}
              className="flex-shrink-0 p-1.5 rounded hover:bg-sidebar-accent transition-colors"
              title="Copy webhook URL"
            >
              {copiedEnv === "webhook" ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* ── Setup Steps ───────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-sidebar p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Setup Steps</h2>
          <div className="space-y-4">
            {SETUP_STEPS.map(({ step, title, description, link, linkLabel }) => (
              <div key={step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
                    >
                      {linkLabel}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Environment Variables ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-sidebar p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Environment Variables</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Add these to your <code className="bg-background px-1 rounded text-primary">backend/.env</code> file:
          </p>
          <div className="space-y-3">
            {ENV_VARS.map(({ name, description, example }) => (
              <div key={name} className="bg-background rounded-md border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs font-mono font-semibold text-primary">{name}</code>
                  <button
                    onClick={() => copyToClipboard(`${name}=${example}`, name)}
                    className="p-1 rounded hover:bg-sidebar-accent transition-colors"
                    title="Copy variable"
                  >
                    {copiedEnv === name ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
                <code className="text-xs text-muted-foreground/60 font-mono block mt-1">
                  Example: {name}={example}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* ── Available Commands ────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-sidebar p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Commands Users Can Send via Instagram DM
          </h2>
          <div className="space-y-2">
            {DM_COMMANDS.map(({ command, description }) => (
              <div key={command} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                <code className="text-xs font-mono text-primary bg-background px-2 py-1 rounded border border-border w-48 flex-shrink-0">
                  {command}
                </code>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
}
