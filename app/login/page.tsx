"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) router.replace("/dashboard"); }); }, [router]);
  function switchMode(nextMode: AuthMode) { setMode(nextMode); setError(""); setSuccess(""); }

  async function signInWithGoogle() {
    setLoading(true); setError("");
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL;
    const redirectOrigin = configuredOrigin && configuredOrigin.startsWith("https://") ? configuredOrigin : window.location.origin;
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: new URL("/dashboard", redirectOrigin).toString(), queryParams: { prompt: "select_account" } } });
    if (authError) { setError("Google-Anmeldung fehlgeschlagen. Bitte versuche es erneut."); setLoading(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setSuccess("");
    if (mode === "signup" && password !== confirmPassword) { setError("Die Passwörter stimmen nicht überein."); setLoading(false); return; }
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    if (result.error) { setError("Anmeldung fehlgeschlagen. Bitte prüfe deine Angaben."); setLoading(false); return; }
    if (mode === "signup" && !result.data.session) { setSuccess("Konto erstellt. Bitte bestätige deine E-Mail-Adresse."); setLoading(false); return; }
    router.replace("/dashboard");
  }

  const isSignup = mode === "signup";
  return <main className="workspace-bg flex min-h-screen items-center justify-center px-5 py-10"><div className="w-full max-w-[420px]"><div className="mb-8 text-center"><div className="mx-auto flex h-20 w-32 items-center justify-center"><Image src="/wendico-logo-v2.png" alt="Wendico" width={126} height={80} className="h-auto w-full object-contain" priority /></div><h1 className="mt-6 text-3xl font-semibold text-white">{isSignup ? "Konto erstellen" : "Wendico"}</h1><p className="auth-muted mt-2 text-base">Interner Bereich für Buchhaltung und Kunden.</p></div><form onSubmit={submit} className="panel rounded-2xl p-6 md:p-8">{error && <Message error>{error}</Message>}{success && <Message>{success}</Message>}<button type="button" onClick={signInWithGoogle} disabled={loading} className="google-login flex items-center justify-center gap-3 disabled:opacity-60"><span className="text-lg font-bold text-[#1967d2]">G</span><span>Mit Google anmelden</span></button><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-white/15"/><span className="auth-muted text-xs font-semibold uppercase">oder per E-Mail</span><span className="h-px flex-1 bg-white/15"/></div><Field id="email" label="E-Mail" type="email" value={email} onChange={setEmail} icon={Mail} autoComplete="email"/><div className="mt-5"><Field id="password" label="Passwort" type="password" value={password} onChange={setPassword} icon={LockKeyhole} autoComplete={isSignup ? "new-password" : "current-password"}/></div>{isSignup && <div className="mt-5"><Field id="confirm" label="Passwort bestätigen" type="password" value={confirmPassword} onChange={setConfirmPassword} icon={LockKeyhole} autoComplete="new-password"/></div>}<button disabled={loading} className="primary mt-6 flex w-full items-center gap-2">{loading ? "Bitte warten..." : isSignup ? "Konto erstellen" : "Anmelden"}<ArrowRight size={16}/></button><p className="auth-muted mt-6 text-center text-sm">{isSignup ? "Bereits registriert?" : "Noch kein Konto?"} <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")} className="font-semibold text-[#77c8ff]">{isSignup ? "Anmelden" : "Registrieren"}</button></p></form></div></main>;
}
function Message({ children, error = false }: { children: React.ReactNode; error?: boolean }) { return <div className={`mb-5 flex gap-2 rounded-xl border p-3 text-sm ${error ? "border-[#6e3340] bg-[#24131e] text-[#ffaaa0]" : "border-[#276347] bg-[#10291e] text-[#7ee2ac]"}`}>{error ? <AlertCircle size={17}/> : <CheckCircle2 size={17}/>} {children}</div>; }
function Field({ id, label, type, value, onChange, icon: Icon, autoComplete }: { id: string; label: string; type: string; value: string; onChange: (value: string) => void; icon: typeof Mail; autoComplete: string }) { return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><div className="relative"><Icon size={17} className="absolute left-3 top-3.5 text-[#9eb1ca]"/><input id={id} type={type} required minLength={type === "password" ? 6 : undefined} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="field pl-10"/></div></label>; }
