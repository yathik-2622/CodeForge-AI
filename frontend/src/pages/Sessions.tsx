import { useState } from "react";
import { useLocation } from "wouter";
import { useListSessions, useCreateSession, useListModels, getListSessionsQueryKey } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { MessageSquare, Plus, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const FALLBACK_MODELS = [
  { id: "mistralai/mistral-7b-instruct:free",      label: "Mistral 7B Instruct",     provider: "openrouter" as const, context: 32768,  badge: "Fast"      },
  { id: "meta-llama/llama-3.1-8b-instruct:free",   label: "Llama 3.1 8B Instruct",   provider: "openrouter" as const, context: 131072, badge: "128k ctx"  },
  { id: "google/gemma-3-12b-it:free",              label: "Gemma 3 12B",             provider: "openrouter" as const, context: 131072, badge: "Google"    },
  { id: "deepseek/deepseek-r1:free",               label: "DeepSeek R1",             provider: "openrouter" as const, context: 163840, badge: "Reasoning" },
  { id: "groq/llama-3.3-70b-versatile",            label: "Llama 3.3 70B Versatile", provider: "groq" as const,       context: 131072, badge: "Groq Fast" },
];

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  model: z.string().min(1),
});
type CreateForm = z.infer<typeof createSchema>;

export default function Sessions() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const { data: sessions } = useListSessions();
  const { data: apiModels } = useListModels();
  const models = apiModels && apiModels.length > 0 ? apiModels : FALLBACK_MODELS;
  const create = useCreateSession();
  const qc = useQueryClient();

  const orModels  = models.filter((m) => m.provider === "openrouter");
  const groqModels = models.filter((m) => m.provider === "groq");

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", model: models[0]?.id ?? FALLBACK_MODELS[0].id },
  });

  const onSubmit = (data: CreateForm) => {
    create.mutate({ data: { ...data, repositoryId: null } } as any, {
      onSuccess: (session: any) => {
        qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setOpen(false);
        form.reset();
        setLocation(`/chat/${session.id}`);
      },
    });
  };

  const modelLabel = (id: string) =>
    models.find((m) => m.id === id)?.label ??
    id.split("/").pop()?.replace(/:free$/, "") ??
    id;

  const modelBadge = (id: string) =>
    models.find((m) => m.id === id)?.badge ?? "";

  const fmtCtx = (n: number) =>
    n >= 131072 ? "128k+" : n >= 32768 ? "32k" : "8k";

  return (
    <Layout>
      <PageHeader
        title="Agent Sessions"
        description={`${sessions?.length ?? 0} sessions · ${models.length} models available (OpenRouter + Groq, all free)`}
        action={
          <Button size="sm" onClick={() => setOpen(true)} data-testid="button-new-session">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Session
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {(!sessions || sessions.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No sessions yet</p>
            <p className="text-xs mt-1">Start a new session to chat with the AI coding agent</p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm mx-auto">
              {[
                "Refactor my auth module",
                "Generate unit tests",
                "Fix TypeScript errors",
                "Search React best practices",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { form.setValue("title", prompt); setOpen(true); }}
                  className="text-left text-xs bg-card border border-card-border px-3 py-2 rounded-lg hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {sessions?.map((session) => (
            <div
              key={session.id}
              className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-4 hover:border-border cursor-pointer transition-colors group"
              onClick={() => setLocation(`/chat/${session.id}`)}
              data-testid={`card-session-${session.id}`}
            >
              <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{session.title}</p>
                  <StatusBadge value={session.status} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    {modelLabel(session.model)}
                    {modelBadge(session.model) && (
                      <span className="ml-1 px-1.5 py-px bg-primary/10 text-primary rounded text-[10px]">
                        {modelBadge(session.model)}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    {session.messageCount} messages
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex-shrink-0">
                {new Date(session.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Agent Session</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you want to build?</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Fix the authentication bug in api/auth.ts" {...field} data-testid="input-session-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Model <span className="text-muted-foreground font-normal">(all free)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {orModels.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            OpenRouter · Free
                          </SelectLabel>
                          {orModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <span className="flex items-center gap-2">
                                {m.label}
                                <span className="text-xs text-muted-foreground">
                                  {m.badge ? `· ${m.badge}` : ""} · {fmtCtx(m.context)} ctx
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {groqModels.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1">
                            Groq · Ultra-fast inference
                          </SelectLabel>
                          {groqModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <span className="flex items-center gap-2">
                                {m.label}
                                <span className="text-xs text-muted-foreground">
                                  {m.badge ? `· ${m.badge}` : ""} · {fmtCtx(m.context)} ctx
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending} data-testid="button-submit-session">
                  {create.isPending ? "Creating..." : "Start Session"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
