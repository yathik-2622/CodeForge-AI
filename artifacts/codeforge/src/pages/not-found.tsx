import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-bold text-foreground mb-2">404</h1>
          <p className="text-muted-foreground text-sm mb-6">Page not found</p>
          <Link href="/">
            <Button size="sm">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
