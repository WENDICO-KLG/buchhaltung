"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {}, []);
  return <main className="workspace-bg flex min-h-screen items-center justify-center px-6"><div className="panel w-full max-w-md rounded-2xl p-7 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3b202b] text-[#ff9b91]"><AlertTriangle size={22} /></div><h1 className="mt-5 text-xl font-semibold text-white">Something went wrong</h1><p className="mt-2 text-sm leading-6 text-[#8292ae]">WendApply could not load this view. Your local data has not been changed.</p><div className="mt-6 flex justify-center gap-3"><button onClick={() => reset()} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#328dff] to-[#55c9ff] px-4 py-2.5 text-sm font-semibold text-[#061022]"><RotateCcw size={16} />Try again</button><Link href="/dashboard" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-[#b9cbea]">Dashboard</Link></div></div></main>;
}