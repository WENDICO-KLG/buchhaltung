"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useStoredTheme } from "./use-stored-theme";
import styles from "./login.module.css";

type AuthMode = "login" | "signup" | "recovery";

export default function LoginPage() {
  const router = useRouter();
  useStoredTheme();
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
  return <main className={cn("workspace-bg flex min-h-dvh items-center justify-center overflow-clip px-4 py-8 sm:px-8", styles.stage)}>
    <div className={cn("raised page-enter w-full max-w-[27rem] lg:grid lg:min-h-[38rem] lg:max-w-[62rem] lg:grid-cols-[1.1fr_1fr]", styles.glass)}>
      <div className="flex flex-col justify-between gap-8 px-6 pt-8 sm:px-10 sm:pt-10 lg:p-12">
        <Image src="/wendico-logo-v2.png" alt="Wendico" width={260} height={166} priority className="h-auto w-24 object-contain lg:w-44"/>
        <div>
          <h1 className="text-[1.75rem] font-medium leading-[1.1] text-[var(--ink)] lg:text-[2.75rem]">{isRecovery ? "Neues Passwort" : isSignup ? "Konto erstellen" : "Wendico"}</h1>
          <p className="auth-muted mt-2 text-sm lg:mt-3">{isRecovery ? "Lege ein neues, sicheres Passwort fest." : "Interner Bereich für Buchhaltung und Kunden."}</p>
        </div>
      </div>
      <div className="flex flex-col justify-center px-6 pb-6 pt-7 sm:px-10 sm:pb-8 lg:p-12 lg:pl-4">
        <form onSubmit={submit}>
          {error && <Message error>{error}</Message>}{success && <Message>{success}</Message>}
          {!isRecovery && <>
            <button type="button" onClick={signInWithGoogle} disabled={loading} className="action min-h-12 w-full !gap-3"><GoogleMark/><span>Mit Google anmelden</span></button>
            <div className="my-5 flex items-center gap-4"><span className="h-px flex-1 bg-[var(--line)]"/><span className="auth-muted text-[13px]">oder per E-Mail</span><span className="h-px flex-1 bg-[var(--line)]"/></div>
            <Field id="email" label="E-Mail" type="email" value={email} onChange={setEmail} icon={Mail} autoComplete="email"/>
          </>}
          <div className={isRecovery ? "" : "mt-4"}><Field id="password" label={isRecovery ? "Neues Passwort" : "Passwort"} type="password" value={password} onChange={setPassword} icon={LockKeyhole} autoComplete={isSignup || isRecovery ? "new-password" : "current-password"}/></div>
          {!isSignup && !isRecovery && <button type="button" onClick={resetPassword} disabled={loading} className="mt-1 min-h-11 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]">Passwort vergessen?</button>}
          {(isSignup || isRecovery) && <div className="mt-4"><Field id="confirm" label="Passwort bestätigen" type="password" value={confirmPassword} onChange={setConfirmPassword} icon={LockKeyhole} autoComplete="new-password"/></div>}
          <button disabled={loading} className={cn("primary min-h-12 w-full", isSignup || isRecovery ? "mt-7" : "mt-3")}>{loading ? "Bitte warten..." : isRecovery ? "Passwort speichern" : isSignup ? "Konto erstellen" : "Anmelden"}<ArrowRight size={17} strokeWidth={1.8}/></button>
        </form>
        {!isRecovery && <p className="auth-muted mt-4 text-center text-[13px]">{isSignup ? "Bereits registriert?" : "Noch kein Konto?"} <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")} className="min-h-11 px-1.5 font-medium text-[var(--ink)] underline decoration-[var(--hairline)] underline-offset-4 transition-colors hover:decoration-[var(--ink)]">{isSignup ? "Anmelden" : "Registrieren"}</button></p>}
      </div>
    </div>
  </main>;
}

function Message({ children, error = false }: { children: React.ReactNode; error?: boolean }) { return <div role={error ? "alert" : "status"} className={cn("mb-5 flex items-center gap-3 text-sm", error ? "text-[var(--coral)]" : "text-[var(--emerald)]")}><span aria-hidden className={cn("dot", error ? "dot-off" : "dot-on")}/><span className="min-w-0">{children}</span></div>; }
function Field({ id, label, type, value, onChange, icon: Icon, autoComplete }: { id: string; label: string; type: string; value: string; onChange: (value: string) => void; icon: typeof Mail; autoComplete: string }) { return <label className="block"><span className="mb-1.5 block text-[13px] text-[var(--muted)]">{label}</span><span className="relative block"><Icon size={18} strokeWidth={1.6} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"/><input id={id} type={type} required minLength={type === "password" ? 8 : undefined} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="field min-h-12 pr-11"/></span></label>; }
function GoogleMark() { return <svg aria-hidden viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>; }
