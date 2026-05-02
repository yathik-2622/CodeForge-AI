import { useState } from "react";
import { useLocation } from "wouter";
import { useListRepositories, useConnectRepository, getListRepositoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { SiGithub, SiGitlab, SiBitbucket } from "react-icons/si";
import { GitBranch, Plus, Search, FileCode2, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProviderIcon = ({ provider }: { provider: string }) => {
  if (provider === "github") return <SiGithub className="w-4 h-4 text-white" />;
  if (provider === "gitlab") return <SiGitlab className="w-4 h-4 text-orange-400" />;
  if (provider === "bitbucket") return <SiBitbucket className="w-4 h-4 text-blue-400" />;
  return <GitBranch className="w-4 h-4 text-muted-foreground" />;
};

const connectSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  provider: z.enum(["github", "gitlab", "bitbucket", "azure", "local"]),
});
type ConnectForm = z.infer<typeof connectSchema>;

export default function Repositories() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: repos } = useListRepositories();
  const connect = useConnectRepository();
  const qc = useQueryClient();

  const form = useForm<ConnectForm>({
    resolver: zodResolver(connectSchema),
    defaultValues: { name: "", url: "", provider: "github" },
  });

  const filtered = (repos ?? []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.language.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = (data: ConnectForm) => {
    connect.mutate({ data }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRepositoriesQueryKey() });
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Repositories"
        description={`${repos?.length ?? 0} connected`}
        action={
          <Button size="sm" onClick={() => setOpen(true)} data-testid="button-connect-repo">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Connect Repository
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No repositories found</p>
              <p className="text-xs mt-1">Connect your first repository to get started</p>
            </div>
          )}
          {filtered.map((repo) => (
            <div
              key={repo.id}
              className="bg-card border border-card-border rounded-lg p-4 flex items-center gap-4 hover:border-border cursor-pointer transition-colors group"
              onClick={() => setLocation(`/repositories/${repo.id}`)}
              data-testid={`card-repo-${repo.id}`}
            >
              <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <ProviderIcon provider={repo.provider} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{repo.fullName}</p>
                  <StatusBadge value={repo.status} />
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileCode2 className="w-3 h-3" /> {repo.fileCount.toLocaleString()} files
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlignLeft className="w-3 h-3" /> {repo.lineCount.toLocaleString()} lines
                  </span>
                  {repo.language && (
                    <span className="text-xs text-muted-foreground">{repo.language}</span>
                  )}
                </div>
                {repo.frameworks.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {repo.frameworks.map((fw) => (
                      <span key={fw} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono">{fw}</span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex-shrink-0">{new Date(repo.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Repository</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="provider" render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-provider">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="gitlab">GitLab</SelectItem>
                      <SelectItem value="bitbucket">Bitbucket</SelectItem>
                      <SelectItem value="azure">Azure DevOps</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myorg/myrepo" {...field} data-testid="input-repo-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://github.com/myorg/myrepo" {...field} data-testid="input-repo-url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={connect.isPending} data-testid="button-submit-connect">
                  {connect.isPending ? "Connecting..." : "Connect"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
