import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, getLoginUrl } from "@/lib/auth";
import { SiGithub } from "react-icons/si";
import { Cpu, GitBranch, Shield, Zap, Globe } from "lucide-react";

const FEATURES = [
  { icon: Cpu, label: "Multi-Agent Orchestration", desc: "Planner, coder, researcher, and reviewer agents working in parallel" },
  { icon: GitBranch, label: "Real GitHub Integration", desc: "Connect any public or private repo — scan, analyze, and edit code" },
  { icon: Globe, label: "Web Search", desc: "Agents search the internet for docs, CVEs, and best practices" },
  { icon: Shield, label: "Security Monitoring", desc: "Automated scanning for secrets, injections, and vulnerabilities" },
  { icon: Zap, label: "Open-Source AI", desc: "Powered by Mistral, Llama 3, and Phi-3 via OpenRouter" },
];

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) setLocation("/");
  }, [user, loading]);

  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[hsl(222_47%_5%)] border-r border-border p-12 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">CodeForge <span className="text-primary">AI</span></span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground leading-tight">
              Your autonomous<br />
              <span className="text-primary">coding platform</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              Multi-agent AI that reads your code, searches the web, and ships production-ready features — autonomously.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Open-source stack · Self-hostable · MIT License
        </p>
      </div>

      {/* Right login */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Cpu className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold">CodeForge AI</h2>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Sign in with GitHub to access your workspace</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {decodeURIComponent(error)}
            </div>
          )}

          <a
            href={getLoginUrl()}
            className="flex items-center justify-center gap-3 w-full bg-foreground text-background font-semibold py-3 px-4 rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <SiGithub className="w-5 h-5" />
            Continue with GitHub
          </a>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              We request <code className="bg-secondary px-1 rounded">repo</code> and <code className="bg-secondary px-1 rounded">read:user</code> scopes to scan your repositories.
              Your GitHub token is stored securely and never shared.
            </p>
          </div>

          <div className="border-t border-border pt-6">
            <p className="text-xs text-center text-muted-foreground mb-3">No GitHub OAuth configured?</p>
            <button
              onClick={() => { window.location.href = "/"; }}
              className="w-full text-sm text-muted-foreground border border-border rounded-lg py-2 hover:bg-secondary transition-colors"
            >
              Continue without login (demo mode)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
