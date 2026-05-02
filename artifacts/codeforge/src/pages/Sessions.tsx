import { useState } from "react";
import { useLocation } from "wouter";
import { useListSessions, useCreateSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { MessageSquare, Plus, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  model: z.enum(["gpt-4o", "claude-3-5-sonnet", "gemini-2.0-flash"]),
});
type CreateForm = z.infer<typeof createSchema>;

const MODEL_LABELS: Record<string, string> = {
  "gpt-4o": "GPT-4o",
  "claude-3-5-sonnet": "Claude 3.5",
  "gemini-2.0-flash": "Gemini Flash",
};

export default function Sessions() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const sessions = useListSessions();
  const create = useCreateSession();
  const qc = useQueryClient();

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", model: "gpt-4o" },
  });

  const onSubmit = (data: CreateForm) => {
    create.mutate({ data: { ...data, repositoryId: null } }, {
      onSuccess: (session) => {
        qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setOpen(false);
        form.reset();
        setLocation(`/chat/${session.id}`);
      },
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Agent Sessions"
        description={`${sessions?.length ?? 0} sessions`}
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
            <p className="text-xs mt-1">Start a new session to interact with the AI agents</p>
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
                    <Cpu className="w-3 h-3" /> {MODEL_LABELS[session.model] ?? session.model}
                  </span>
                  <span className="text-xs text-muted-foreground">{session.messageCount} messages</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex-shrink-0">{new Date(session.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Session</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Refactor authentication module" {...field} data-testid="input-session-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4o — Reasoning</SelectItem>
                      <SelectItem value="claude-3-5-sonnet">Claude 3.5 — Long context</SelectItem>
                      <SelectItem value="gemini-2.0-flash">Gemini Flash — Speed</SelectItem>
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
