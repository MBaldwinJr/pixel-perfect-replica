import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLogo } from "@/components/layout/brand-logo";
import { useAuth } from "@/features/auth/auth-provider";
import { SignInForm, SignUpForm } from "@/features/auth/auth-forms";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Peixoto Tax Intelligence" },
      { name: "description", content: "Acesso restrito à plataforma Peixoto Tax Intelligence." },
      { property: "og:title", content: "Entrar — Peixoto Tax Intelligence" },
      { property: "og:description", content: "Acesso restrito à plataforma Peixoto Tax Intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><BrandLogo /></div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-xl font-semibold">Acesso à plataforma</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">Uso restrito a colaboradores autorizados.</p>
          <Tabs defaultValue="signin">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><SignInForm onSuccess={() => void navigate({ to: "/dashboard" })} /></TabsContent>
            <TabsContent value="signup"><SignUpForm /></TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
