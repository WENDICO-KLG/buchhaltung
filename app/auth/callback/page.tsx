"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStoredTheme } from "@/app/login/use-stored-theme";
import styles from "@/app/login/login.module.css";

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

  return <main className={`workspace-bg flex min-h-dvh items-center justify-center overflow-clip px-4 ${styles.stage}`}>
    <div className="raised page-enter w-full max-w-sm px-7 py-9 text-center">
      <h1 className="sr-only">Anmeldung</h1>
      {error ? <>
        <span aria-hidden className="user-avatar mx-auto !text-[var(--coral)]"><AlertCircle size={19} strokeWidth={1.6}/></span>
        <p role="alert" className="mt-4 text-base text-[var(--ink)]">{error}</p>
        <button onClick={() => router.replace("/login")} className="primary mt-7 w-full">Zur Anmeldung</button>
      </> : <>
        <span aria-hidden className="user-avatar mx-auto !text-[var(--green)]"><LoaderCircle size={20} strokeWidth={1.6} className="animate-spin"/></span>
        <p role="status" className="mt-4 text-base text-[var(--ink)]">Anmeldung wird abgeschlossen...</p>
      </>}
    </div>
  </main>;
}
