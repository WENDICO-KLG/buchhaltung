"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup" | "recovery";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { setMode("recovery"); setLoading(false); return; }
      if (event === "INITIAL_SESSION" && session?.user) router.replace("/dashboard");
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  function switchMode(nextMode: AuthMode) { setMode(nextMode); setError(""); setSuccess(""); setPassword(""); setConfirmPassword(""); }

  async function signInWithGoogle() {
    setLoading(true); setError("");
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
    const redirectOrigin = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? window.location.origin
      : configuredOrigin && configuredOrigin.startsWith("https://") ? configuredOrigin : window.location.origin;
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL("/auth/callback", redirectOrigin).toString(), queryParams: { prompt: "select_account" } } });
    if (authError) { setError("Google-Anmeldung fehlgeschlagen. Bitte versuche es erneut."); setLoading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setSuccess("");
    if ((mode === "signup" || mode === "recovery") && password !== confirmPassword) { setError("Die Passwörter stimmen nicht überein."); setLoading(false); return; }
    if (mode === "recovery") {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) setError("Das Passwort konnte nicht aktualisiert werden.");
      else { setSuccess("Passwort aktualisiert. Du wirst weitergeleitet."); window.setTimeout(() => router.replace("/dashboard"), 800); }
      setLoading(false); return;
    }
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
    const redirectOrigin = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? window.location.origin
      : configuredOrigin && configuredOrigin.startsWith("https://") ? configuredOrigin : window.location.origin;
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL("/auth/callback", redirectOrigin).toString() } });
    if (result.error) { setError("Anmeldung fehlgeschlagen. Bitte prüfe deine Angaben."); setLoading(false); return; }
    if (mode === "signup" && !result.data.session) { setSuccess("Konto erstellt. Bitte bestätige deine E-Mail-Adresse."); setLoading(false); return; }
    router.replace("/dashboard");
  }

  async function resetPassword() {
    setError(""); setSuccess("");
    if (!email) { setError("Bitte zuerst deine E-Mail-Adresse eingeben."); return; }
    setLoading(true);
    const origin = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith("https://") ? process.env.NEXT_PUBLIC_APP_URL : window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: new URL("/login", origin).toString() });
    if (resetError) setError("Die Reset-E-Mail konnte nicht gesendet werden."); else setSuccess("Reset-Link gesendet. Bitte prüfe dein Postfach.");
    setLoading(false);
  }

  const isSignup = mode === "signup"; const isRecovery = mode === "recovery";
  return <main className="workspace-bg flex min-h-screen items-center justify-center px-5 py-10"><div className="w-full max-w-[420px]"><div className="mb-8 text-center"><div className="mx-auto flex h-20 w-32 items-center justify-center"><img src="/wendico-logo-v2.png" alt="Wendico" width={126} height={80} className="h-auto w-full object-contain"/></div><h1 className="mt-6 text-3xl font-semibold text-white">{isRecovery ? "Neues Passwort" : isSignup ? "Konto erstellen" : "Wendico"}</h1><p className="auth-muted mt-2 text-base">{isRecovery ? "Lege ein neues, sicheres Passwort fest." : "Interner Bereich für Buchhaltung und Kunden."}</p></div><form onSubmit={submit} className="panel rounded-2xl p-6 md:p-8">{error && <Message error>{error}</Message>}{success && <Message>{success}</Message>}{!isRecovery && <><button type="button" onClick={signInWithGoogle} disabled={loading} className="google-login flex items-center justify-center gap-3 disabled:opacity-60"><span className="text-lg font-bold text-[#1967d2]">G</span><span>Mit Google anmelden</span></button><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-[var(--line)]"/><span className="auth-muted text-xs font-semibold uppercase">oder per E-Mail</span><span className="h-px flex-1 bg-[var(--line)]"/></div><Field id="email" label="E-Mail" type="email" value={email} onChange={setEmail} icon={Mail} autoComplete="email"/></>}<div className={isRecovery ? "" : "mt-5"}><Field id="password" label={isRecovery ? "Neues Passwort" : "Passwort"} type="password" value={password} onChange={setPassword} icon={LockKeyhole} autoComplete={isSignup || isRecovery ? "new-password" : "current-password"}/></div>{!isSignup && !isRecovery && <button type="button" onClick={resetPassword} disabled={loading} className="mt-3 text-sm font-semibold text-[var(--primary)]">Passwort vergessen?</button>}{(isSignup || isRecovery) && <div className="mt-5"><Field id="confirm" label="Passwort bestätigen" type="password" value={confirmPassword} onChange={setConfirmPassword} icon={LockKeyhole} autoComplete="new-password"/></div>}<button disabled={loading} className="primary mt-6 flex w-full items-center gap-2">{loading ? "Bitte warten..." : isRecovery ? "Passwort speichern" : isSignup ? "Konto erstellen" : "Anmelden"}<ArrowRight size={16}/></button>{!isRecovery && <p className="auth-muted mt-6 text-center text-sm">{isSignup ? "Bereits registriert?" : "Noch kein Konto?"} <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")} className="font-semibold text-[var(--primary)]">{isSignup ? "Anmelden" : "Registrieren"}</button></p>}</form></div></main>;
}

function Message({ children, error = false }: { children: React.ReactNode; error?: boolean }) { return <div className={`mb-5 flex gap-2 rounded-lg border p-3 text-sm ${error ? "border-[#fda29b] bg-[#fee4e2] text-[#b42318]" : "border-[#6ce9a6] bg-[#d1fadf] text-[#05603a]"}`}>{error ? <AlertCircle size={17}/> : <CheckCircle2 size={17}/>} {children}</div>; }
function Field({ id, label, type, value, onChange, icon: Icon, autoComplete }: { id: string; label: string; type: string; value: string; onChange: (value: string) => void; icon: typeof Mail; autoComplete: string }) { return <label className="block"><span className="mb-2 block text-sm font-semibold text-[var(--ink)]">{label}</span><div className="relative flex items-center"><Icon size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"/><input id={id} type={type} required minLength={type === "password" ? 8 : undefined} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="field pr-10"/></div></label>; }
