"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
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

  return <main className="workspace-bg flex min-h-screen items-center justify-center px-5"><div className="panel rounded-2xl px-8 py-7 text-center"><div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-[#287bff]"/><p className="mt-4 text-sm text-white">Anmeldung wird abgeschlossen...</p>{error && <p className="mt-4 max-w-xs text-sm text-[#fda29b]">{error}</p>}{error && <button onClick={() => router.replace("/login")} className="primary mt-5">Zur Anmeldung</button>}</div></main>;
}