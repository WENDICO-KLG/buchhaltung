export default function Loading() {
  return <main className="workspace-bg flex min-h-screen items-center justify-center px-6"><div role="status" className="w-full max-w-xs text-center"><p className="display text-3xl text-[var(--ink)]">Wendico</p><div aria-hidden className="skeleton mx-auto mt-5 h-px w-24 !bg-[var(--gold)]" /><p className="mt-5 text-sm font-medium text-[var(--ink)]">Wendico Buchhaltung wird geladen</p><p className="mt-1 text-sm text-[var(--muted)]">Finanzdaten werden vorbereitet...</p></div></main>;
}
