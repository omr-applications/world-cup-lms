import { Icon } from "./icon";

export function SetupRequired() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center gap-8">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Icon name="trophy" size={22} filled />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">World Cup LMS</p>
            <h1 className="text-3xl font-semibold tracking-normal">Configure Convex to start</h1>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-panel-border bg-panel p-5 shadow-sm">
            <Icon name="database" className="mb-4 text-accent" size={24} />
            <h2 className="text-lg font-semibold">Create or link a Convex deployment</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">npx convex dev</code>{" "}
              and follow the prompts. Convex will create <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">.env.local</code>{" "}
              with <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">NEXT_PUBLIC_CONVEX_URL</code>.
            </p>
          </div>

          <div className="rounded-lg border border-panel-border bg-panel p-5 shadow-sm">
            <Icon name="key" className="mb-4 text-accent" size={24} />
            <h2 className="text-lg font-semibold">Set Convex Auth keys</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Convex Auth needs <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">JWT_PRIVATE_KEY</code>{" "}
              and <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">JWKS</code> in the Convex dashboard or CLI env.
              A generator script is included at <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">scripts/generate-auth-keys.mjs</code>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
