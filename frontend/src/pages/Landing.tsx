import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, getLoginUrl } from "@/lib/auth";
import { SiGithub } from "react-icons/si";
import {
  Cpu, GitBranch, Shield, Zap, Globe, Terminal,
  Code2, Bot, MessageSquare, Rocket, Star, ChevronRight, Package,
} from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "23 Free AI Models",
    desc: "Access Llama 4, Gemma 3, DeepSeek R1, Qwen 3, and more — completely free via OpenRouter and Groq.",
    color: "from-violet-500/20 to-violet-500/5 border-violet-500/30",
    iconColor: "text-violet-400",
  },
  {
    icon: GitBranch,
    title: "Real GitHub Integration",
    desc: "Connect any public or private repo. Scan, analyze, and edit code directly from the browser.",
    color: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    iconColor: "text-blue-400",
  },
  {
    icon: Globe,
    title: "Web Search Agents",
    desc: "Agents search the internet for docs, CVEs, Stack Overflow answers, and best practices in real time.",
    color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    icon: Shield,
    title: "Security Scanning",
    desc: "Automated scanning for hardcoded secrets, SQL injections, XSS, and OWASP Top-10 vulnerabilities.",
    color: "from-red-500/20 to-red-500/5 border-red-500/30",
    iconColor: "text-red-400",
  },
  {
    icon: Terminal,
    title: "CLI Tool (cf)",
    desc: "Use cf ask, cf fix, cf explain, cf commit, cf generate from any terminal — works on any project.",
    color: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
    iconColor: "text-yellow-400",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Bot",
    desc: "Ask CodeForge AI questions and get code snippets directly in WhatsApp via Twilio integration.",
    color: "from-green-500/20 to-green-500/5 border-green-500/30",
    iconColor: "text-green-400",
  },
  {
    icon: Code2,
    title: "VS Code Extension",
    desc: "Chat, fix, explain, and generate tests for selected code without leaving your editor.",
    color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
  {
    icon: Rocket,
    title: "Multi-Agent Orchestration",
    desc: "Planner, coder, researcher, and reviewer agents working in parallel to ship features autonomously.",
    color: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
    iconColor: "text-orange-400",
  },
];

const OPENROUTER_MODELS = [
  "Gemma 2 9B", "Gemma 3 12B", "Llama 3.1 8B", "Llama 3.2 3B",
  "DeepSeek R1", "DeepSeek R1 70B", "Qwen 2.5 7B", "Mistral Nemo 12B",
  "Phi-3 Mini", "OpenChat 7B", "Mistral Small 3.2",
];

const GROQ_MODELS = [
  "Llama 3.3 70B", "Llama 4 Scout 17B", "Qwen 3 32B",
  "Groq Compound", "GPT OSS 120B", "GPT OSS 20B", "Llama 3.1 8B",
];

const CLI_COMMANDS = [
  { cmd: "cf ask", desc: "Chat with any model from terminal" },
  { cmd: "cf fix <file>", desc: "Auto-fix bugs with AI" },
  { cmd: "cf explain <file>", desc: "Get plain-English explanation" },
  { cmd: "cf commit", desc: "AI-generated commit message" },
  { cmd: "cf generate <desc>", desc: "Generate a complete file from description" },
  { cmd: "cf analyze <file>", desc: "Deep code review & security scan" },
];

const STATS = [
  { value: "23", label: "Free AI Models" },
  { value: "0$", label: "Cost to use" },
  { value: "6", label: "CLI Commands" },
  { value: "∞", label: "Possibilities" },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const [, setLocation]   = useLocation();

  useEffect(() => {
    if (!loading && user) setLocation("/");
  }, [user, loading]);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const error  = params.get("error");

  return (
    <div className="min-h-screen bg-[hsl(222_47%_4%)] text-foreground overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[hsl(222_47%_4%)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Cpu className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              CodeForge <span className="text-primary">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/yathik-2622/CodeForge-AI"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SiGithub className="w-4 h-4" /> GitHub
            </a>
            <a
              href={getLoginUrl()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <SiGithub className="w-4 h-4" /> Sign in with GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* ── Error banner ── */}
      {error && (
        <div className="fixed top-16 inset-x-0 z-40 bg-red-500/10 border-b border-red-500/30 px-6 py-3 text-sm text-red-400 text-center">
          Login failed: {decodeURIComponent(error)} — please try again.
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-32 px-6 text-center">
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-8">
            <Star className="w-3 h-3" /> Open source · 23 free AI models · No credit card
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Your autonomous<br />
            <span className="bg-gradient-to-r from-primary via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              coding platform
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Multi-agent AI that reads your code, searches the web, scans for security issues,
            and ships production-ready features — completely free with 23 open-source models.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={getLoginUrl()}
              className="flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
            >
              <SiGithub className="w-5 h-5" />
              Get started with GitHub
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/yathik-2622/CodeForge-AI"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-8 py-4 rounded-xl border border-border text-sm font-medium hover:border-primary/50 transition-colors"
            >
              <SiGithub className="w-4 h-4" /> View on GitHub
            </a>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Free forever · No credit card required · Open source on GitHub
          </p>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-4xl font-extrabold text-primary mb-1">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to ship faster</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              CodeForge AI connects your code, your AI models, and your tools into one autonomous platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, iconColor }) => (
              <div
                key={title}
                className={`rounded-xl border bg-gradient-to-br p-5 ${color}`}
              >
                <div className={`w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center mb-4 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Models ── */}
      <section className="py-24 px-6 bg-card/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">23 free AI models, two providers</h2>
            <p className="text-muted-foreground">OpenRouter free tier + Groq's blazing-fast inference — your key, our app.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-violet-400" />
                <h3 className="font-semibold">OpenRouter <span className="text-xs text-muted-foreground ml-1">free tier</span></h3>
              </div>
              <div className="space-y-2">
                {OPENROUTER_MODELS.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                    <span className="text-muted-foreground">{m}</span>
                  </div>
                ))}
              </div>
              <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs text-violet-400 hover:underline">
                Get free OpenRouter key <ChevronRight className="w-3 h-3" />
              </a>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold">Groq <span className="text-xs text-muted-foreground ml-1">blazing fast</span></h3>
              </div>
              <div className="space-y-2">
                {GROQ_MODELS.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                    <span className="text-muted-foreground">{m}</span>
                  </div>
                ))}
              </div>
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs text-yellow-400 hover:underline">
                Get free Groq key <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLI Demo ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs font-medium mb-6">
              <Terminal className="w-3 h-3" /> CLI Tool
            </div>
            <h2 className="text-3xl font-bold mb-4">CodeForge AI in your terminal</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Install the <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">cf</code> CLI globally
              and use AI directly from any project directory. Works with any language.
            </p>
            <div className="bg-card border border-border rounded-lg p-3 text-xs font-mono text-muted-foreground mb-6">
              <span className="text-emerald-400">$</span> npm install -g codeforge-ai-cli
            </div>
            <div className="space-y-3">
              {CLI_COMMANDS.map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-start gap-3">
                  <code className="text-primary bg-primary/10 px-2 py-0.5 rounded text-xs font-mono flex-shrink-0 mt-0.5">{cmd}</code>
                  <span className="text-sm text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-[hsl(222_47%_4%)] overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-muted-foreground font-mono">terminal</span>
            </div>
            <div className="p-5 font-mono text-sm space-y-3">
              <div><span className="text-emerald-400">$</span> <span className="text-foreground">cf ask "fix this TypeError in my React app"</span></div>
              <div className="text-muted-foreground text-xs pl-2">Using google/gemma-2-9b-it:free via OpenRouter</div>
              <div className="text-muted-foreground text-xs pl-2">Analyzing your question...</div>
              <div className="text-foreground text-xs pl-2 leading-relaxed">
                The TypeError occurs because you're accessing <span className="text-yellow-400">data.user.name</span> before
                the async fetch resolves. Add optional chaining: <span className="text-emerald-400">data?.user?.name</span>
                or add a loading check before rendering.
              </div>
              <div className="mt-2"><span className="text-emerald-400">$</span> <span className="text-foreground">cf commit</span></div>
              <div className="text-primary text-xs pl-2">✓ feat: fix null reference in user data fetch</div>
              <div className="text-emerald-400 text-xs">█<span className="animate-pulse">_</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-violet-500/5 p-12">
            <Cpu className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Ready to code smarter?</h2>
            <p className="text-muted-foreground mb-8">
              Sign in with GitHub and start using 23 free AI models to ship better code, faster.
            </p>
            <a
              href={getLoginUrl()}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
            >
              <SiGithub className="w-5 h-5" />
              Sign in with GitHub — it's free
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Cpu className="w-3 h-3 text-primary-foreground" />
            </div>
            <span>CodeForge AI — open source, free forever</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/yathik-2622/CodeForge-AI" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">OpenRouter</a>
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Groq</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
