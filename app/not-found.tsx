import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <main className="workspace-bg flex min-h-screen items-center justify-center px-6"><div className="panel w-full max-w-md rounded-2xl p-7 text-center"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#56c8ff]">404 / WendApply</p><h1 className="mt-4 text-2xl font-semibold text-white">This view does not exist</h1><p className="mt-2 text-sm leading-6 text-[#8292ae]">The page may have moved, or the link may be outdated.</p><Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#328dff] to-[#55c9ff] px-4 py-2.5 text-sm font-semibold text-[#061022]"><ArrowLeft size={16} />Back to dashboard</Link></div></main>;
}