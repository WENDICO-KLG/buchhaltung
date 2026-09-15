"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ContactRound, FileArchive, FileText, LayoutDashboard, LogOut, Menu, PanelsTopLeft, ReceiptText, Settings, Sun, Users } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { NotificationCenter } from "@/components/layout/notification-center";

const navigation = [
  { label: "Übersicht", href: "/dashboard", icon: LayoutDashboard },
  { label: "Rechnungen", href: "/applications", icon: FileText },
  { label: "Ausgaben", href: "/analytics", icon: ReceiptText },
  { label: "Belege", href: "/cvs", icon: FileArchive },
  { label: "Kunden", href: "/customers", icon: Users },
  { label: "Workspace", href: "/workspace/projects", icon: PanelsTopLeft },
  { label: "Prospects", href: "/prospects", icon: ContactRound },
  { label: "Unternehmen", href: "/profile", icon: Building2 },
  { label: "Einstellungen", href: "/settings", icon: Settings },
];

export function WorkspaceShell({ children, active, title = "Wendico" }: { children: React.ReactNode; active: string; title?: string }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">(() => typeof window !== "undefined" && window.localStorage.getItem("wendico-books.theme") === "light" ? "light" : "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem("wendico-books.theme", theme);
    window.dispatchEvent(new CustomEvent("wendico-books-theme", { detail: theme }));
  }, [theme]);

  useEffect(() => {
    let mounted = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setCheckingSession(false);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (!checkingSession && !user) router.replace("/login"); }, [checkingSession, router, user]);
  async function logout() { await supabase.auth.signOut(); router.replace("/login"); }

  if (checkingSession || !user) return <main className="workspace-bg flex min-h-screen items-center justify-center"><div className="panel rounded-2xl px-8 py-7 text-center"><div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-[#287bff]" /><p className="mt-4 text-sm text-white">Wendico wird geladen...</p></div></main>;

  const initials = (user.email?.slice(0, 2) ?? "WE").toUpperCase();
  const links = navigation.map(({ label, href, icon: Icon }) => <Link key={label} href={href} title={label} onClick={() => setMobileOpen(false)} className={`flex h-9 items-center justify-center gap-3 rounded-xl px-3 transition ${active === label ? "bg-[#153a71] text-[#65c6ff] blue-glow" : "text-[#7185a6] hover:bg-white/5 hover:text-white"}`}><Icon size={18} strokeWidth={1.8} /><span className="md:hidden">{label}</span></Link>);

  return <div className={`workspace-bg min-h-screen ${theme === "light" ? "light" : ""}`}>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[84px] flex-col items-center border-r border-white/10 bg-[#061022]/85 py-5 backdrop-blur-xl md:flex">
      <Link href="/dashboard" aria-label="Wendico Übersicht" className="flex h-12 w-16 items-center justify-center"><Image src="/wendico-logo-v2.png" alt="Wendico" width={63} height={40} className="h-auto w-full object-contain" priority /></Link>
      <nav className="mt-6 flex flex-col gap-2">{links}</nav>
      <button onClick={logout} aria-label="Abmelden" title="Abmelden" className="mt-auto flex h-9 w-9 items-center justify-center rounded-xl bg-[#13274a] text-[#87b9ff]"><LogOut size={17} /></button>
    </aside>
    {mobileOpen && <div className="fixed inset-0 z-40 bg-[#020713]/75 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}><nav className="h-full w-[270px] border-r border-white/10 bg-[#071326] p-6" onClick={(event) => event.stopPropagation()}><div className="flex items-center gap-3"><span className="flex h-12 w-[76px] items-center"><Image src="/wendico-logo-v2.png" alt="Wendico" width={75} height={48} className="h-auto w-full object-contain" /></span><span className="font-semibold text-white">Wendico</span></div><div className="mt-8 space-y-2">{links}</div></nav></div>}
    <main className="min-h-screen md:pl-[84px]"><header className="app-header sticky top-0 z-20 flex h-16 items-center justify-between px-5 md:px-8"><div className="flex min-w-0 items-center gap-3"><button className="header-icon-button md:hidden" onClick={() => setMobileOpen(true)} aria-label="Menü öffnen"><Menu size={21} /></button><span className="truncate text-sm font-semibold text-[var(--ink)]">{title}</span></div><div className="flex items-center gap-2"><NotificationCenter/><button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Darstellung wechseln" className="header-icon-button"><Sun size={17} /></button><span className="user-avatar">{initials}</span></div></header><div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">{children}</div></main>
  </div>;
}
