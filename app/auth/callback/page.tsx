"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Guilloche } from "@/components/ui/guilloche";
import { useStoredTheme } from "@/app/login/use-stored-theme";

export default function AuthCallbackPage() {
  const router = useRouter();
  useStoredTheme();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const authError = searchParams.get("error_description") ?? searchParams.get("error");

    if (authError) {
      setError("Die Google-Anmeldung wurde abgebrochen.");
      return () => { active = false; };
    }

    if (!code && !tokenHash) {
      router.replace("/login");
      return () => { active = false; };
    }

    const sessionPromise = code
      ? supabase.auth.exchangeCodeForSession(code)
      : supabase.auth.verifyOtp({ token_hash: tokenHash as string, type: "email" });
    sessionPromise.then(({ error: exchangeError }) => {
      if (!active) return;
      if (exchangeError) {
        setError("Der Bestätigungslink ist ungültig oder abgelaufen.");
        return;
      }
      router.replace("/dashboard");
    });

    const timeout = window.setTimeout(() => {
      if (active) setError("Die Anmeldung dauert zu lange. Bitte starte sie erneut.");
    }, 15000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return <main className="workspace-bg flex min-h-screen items-center justify-center overflow-clip px-5">
    <Guilloche className="absolute left-1/2 top-1/2 -z-10 w-[min(60rem,160vw)] max-w-none -translate-x-1/2 -translate-y-1/2"/>
    <div className="raised w-full max-w-sm rounded-2xl px-8 py-9 text-center">
      {error ? <>
        <AlertCircle aria-hidden size={28} strokeWidth={1.5} className="mx-auto text-[var(--coral)]"/>
        <p role="alert" className="mt-4 text-base text-[var(--ink)]">{error}</p>
        <button onClick={() => router.replace("/login")} className="primary mt-7 w-full">Zur Anmeldung</button>
      </> : <>
        <LoaderCircle aria-hidden size={30} strokeWidth={1.3} className="mx-auto animate-spin text-[var(--gold)]"/>
        <p role="status" className="mt-4 text-base text-[var(--ink)]">Anmeldung wird abgeschlossen...</p>
      </>}
    </div>
  </main>;
}
