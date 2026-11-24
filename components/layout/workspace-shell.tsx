"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Building2, Calculator, ContactRound, FileArchive, LayoutDashboard, ListTodo, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, ReceiptText, Settings, Share2, Sun, Users, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { canAccessPage, getActiveCompany } from "@/lib/company";
import type { CompanyMembership } from "@/lib/company";
import { NotificationCenter } from "@/components/layout/notification-center";
import { CelebrationHost } from "@/components/ui/celebration";
import { Skeleton } from "@/components/ui/skeleton";

const navigation = [
  { label: "Übersicht", href: "/dashboard", icon: LayoutDashboard },
  { label: "To-Dos", href: "/todos", icon: ListTodo },
  { label: "Kunden", href: "/customers", icon: Users },
  { label: "Ausgaben", href: "/analytics", icon: ReceiptText },
  { label: "Rechner", href: "/calculator", icon: Calculator },
  { label: "Ayleen Social Media", href: "/social-media", icon: Share2 },
  { label: "Prospects", href: "/prospects", icon: ContactRound },
  { label: "Belege", href: "/cvs", icon: FileArchive },
  { label: "Unternehmen", href: "/profile", icon: Building2 },
  { label: "Einstellungen", href: "/settings", icon: Settings },
];

const tabOrder = ["/dashboard", "/prospects", "/customers", "/todos", "/analytics", "/cvs", "/calculator", "/social-media", "/profile", "/settings"];
const tabLabels: Record<string, string> = { "/social-media": "Social", "/profile": "Firma", "/settings": "Optionen" };

const sidebarKey = "wendico-books.sidebar";
const sidebarEvent = "wendico-books-sidebar";
const readCollapsed = () => { try { return window.localStorage.getItem(sidebarKey) === "collapsed"; } catch { return false; } };
const subscribeCollapsed = (notify: () => void) => { window.addEventListener(sidebarEvent, notify); window.addEventListener("storage", notify); return () => { window.removeEventListener(sidebarEvent, notify); window.removeEventListener("storage", notify); }; };
function storeCollapsed(value: boolean) {
  try { window.localStorage.setItem(sidebarKey, value ? "collapsed" : "open"); } catch { return; }
  window.dispatchEvent(new Event(sidebarEvent));
}

export function WorkspaceShell({ children, active, title = "Wendico" }: { children: React.ReactNode; active: string; title?: string }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [companyReady, setCompanyReady] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const [company, setCompany] = useState<CompanyMembership>();
  const [theme, setTheme] = useState<"dark" | "light">(() => typeof window !== "undefined" && window.localStorage.getItem("wendico-books.theme") === "light" ? "light" : "dark");

  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem("wendico-books.theme", theme);
    window.dispatchEvent(new CustomEvent("wendico-books-theme", { detail: theme }));
  }, [theme]);

  // Keeps the header in sync when the settings page switches the theme.
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    window.addEventListener("wendico-books-theme", sync);
    return () => window.removeEventListener("wendico-books-theme", sync);
  }, []);

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
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    getActiveCompany().then((company) => {
      if (!mounted) return;
      if (!company && active !== "Einstellungen") { router.replace("/settings"); return; }
      const page = navigation.find(({ label }) => label === active);
      if (company && page && !canAccessPage(company, page.href.slice(1))) { router.replace(navigation.find(({ href }) => canAccessPage(company, href.slice(1)))?.href ?? "/settings"); return; }
      setCompany(company);
      setCompanyReady(true);
    }).catch((error: unknown) => {
      if (!mounted) return;
      if (active === "Einstellungen") setCompanyReady(true);
      else setCompanyError(error instanceof Error ? error.message : "Firma konnte nicht geladen werden.");
    });
    return () => { mounted = false; };
  }, [active, router, user]);
  async function logout() { await supabase.auth.signOut(); router.replace("/login"); }

  if (companyError) return <main className="workspace-bg flex min-h-screen items-center justify-center px-6"><div className="panel max-w-lg rounded-2xl p-7"><p role="alert" className="text-[var(--coral)]">{companyError}</p><Link href="/settings" className="action mt-4">Einstellungen</Link><button onClick={logout} className="action mt-4 ml-3"><LogOut size={16}/>Abmelden</button></div></main>;
  if (checkingSession || !user || !companyReady) return <ShellSkeleton collapsed={collapsed}/>;

  const initials = (user.email?.slice(0, 2) ?? "WE").toUpperCase();
  const permittedNavigation = navigation.filter(({ href }) => !company ? href === "/settings" : canAccessPage(company, href.slice(1)));
  const activePage = navigation.find(({ label }) => label === active);
  const denied = Boolean(company && activePage && !canAccessPage(company, activePage.href.slice(1)));
  const home = permittedNavigation[0]?.href ?? "/settings";
  const tabs = tabOrder.flatMap((path) => permittedNavigation.filter(({ href }) => href === path)).slice(0, 4);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const sections = title.split(" / ");

  return <div className={`workspace-bg min-h-screen ${collapsed ? "shell-sidebar-collapsed" : ""}`}>
    <a href="#inhalt" className="primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:px-4 focus:py-2">Zum Inhalt springen</a>
    <aside className="shell-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col px-3 pb-4 pt-5 md:flex">
      <Link href={home} aria-label="Wendico Startseite" className={`flex h-11 flex-none items-center gap-3 rounded-lg ${collapsed ? "justify-center" : "px-2.5"}`}>
        <Image src="/wendico-logo-v2.png" alt="Wendico" width={42} height={27} className="brand-mark h-auto w-[38px] flex-none object-contain" priority />
        {!collapsed && <span className="display text-2xl text-[var(--ink)]">Wendico</span>}
      </Link>
      <nav aria-label="Hauptnavigation" className="mt-7 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-0.5">
        {permittedNavigation.map(({ label, href, icon: Icon }) => <Link key={label} href={href} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} aria-current={active === label ? "page" : undefined} className={`shell-link ${collapsed ? "justify-center px-0" : ""}`}><Icon size={19} strokeWidth={1.6} />{!collapsed && <span className="truncate">{label}</span>}</Link>)}
      </nav>
      <div className="mt-3 flex flex-none flex-col gap-1 border-t border-[var(--line)] px-0.5 pt-3">
        {!collapsed && <p className="truncate px-3.5 pb-1 text-[13px] text-[var(--muted)]" title={user.email}>{user.email}</p>}
        <button type="button" onClick={logout} aria-label="Abmelden" title="Abmelden" className={`shell-link ${collapsed ? "justify-center px-0" : ""}`}><LogOut size={19} strokeWidth={1.6} />{!collapsed && <span>Abmelden</span>}</button>
        <button type="button" onClick={() => storeCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"} title={collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"} className={`shell-link ${collapsed ? "justify-center px-0" : ""}`}>{collapsed ? <PanelLeftOpen size={19} strokeWidth={1.6} /> : <><PanelLeftClose size={19} strokeWidth={1.6} /><span>Einklappen</span></>}</button>
      </div>
    </aside>
    <div className="shell-main min-h-screen">
      <header className="app-header sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={home} aria-label="Wendico Startseite" className="flex h-11 w-9 flex-none items-center justify-center md:hidden"><Image src="/wendico-logo-v2.png" alt="Wendico" width={34} height={22} className="brand-mark h-auto w-full object-contain" /></Link>
          <span className="truncate text-sm text-[var(--muted)]">{sections.slice(0, -1).map((section) => <span key={section} className="hidden sm:inline">{section}<span aria-hidden className="mx-2 opacity-50">/</span></span>)}<span className="font-medium text-[var(--ink)]">{sections[sections.length - 1]}</span></span>
        </div>
        <div className="flex flex-none items-center gap-1">
          <NotificationCenter/>
          <button type="button" onClick={toggleTheme} aria-label="Darstellung wechseln" title="Darstellung wechseln" className="header-icon-button">{theme === "dark" ? <Sun size={18} strokeWidth={1.7} /> : <Moon size={18} strokeWidth={1.7} />}</button>
          <span className="user-avatar ml-1.5" title={user.email}>{initials}</span>
        </div>
      </header>
      <main id="inhalt" tabIndex={-1} className="mx-auto min-w-0 max-w-[1440px] px-4 pb-[calc(var(--tabbar-h)+2rem)] pt-6 outline-none sm:px-6 md:px-8 md:pb-12 md:pt-9 lg:px-10">{denied ? <div role="alert" className="py-10 text-center"><h1 className="text-3xl">Kein Zugriff auf diese Seite</h1><Link href={home} className="action mt-6">Zur freigegebenen Seite</Link></div> : children}</main>
    </div>
    <nav aria-label="Schnellnavigation" className="shell-tabbar fixed inset-x-0 bottom-0 z-30 flex px-1 md:hidden">
      {tabs.map(({ label, href, icon: Icon }) => <Link key={label} href={href} aria-label={label} aria-current={active === label ? "page" : undefined} className="shell-tab"><Icon size={21} strokeWidth={1.6} /><span className="max-w-full truncate px-0.5">{tabLabels[href] ?? label}</span></Link>)}
      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Menü öffnen" aria-haspopup="dialog" aria-expanded={mobileOpen} className="shell-tab"><Menu size={21} strokeWidth={1.6} /><span>Menü</span></button>
    </nav>
    {mobileOpen && <MobileSheet onClose={() => setMobileOpen(false)}>
      <nav aria-label="Alle Bereiche" className="mt-2 grid gap-1">{permittedNavigation.map(({ label, href, icon: Icon }) => <Link key={label} href={href} onClick={() => setMobileOpen(false)} aria-current={active === label ? "page" : undefined} className="shell-link min-h-12 text-base"><Icon size={20} strokeWidth={1.6} /><span className="truncate">{label}</span></Link>)}</nav>
      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <p className="mb-3 truncate text-sm text-[var(--muted)]">{user.email}</p>
        <button type="button" onClick={logout} className="action w-full"><LogOut size={17}/>Abmelden</button>
      </div>
    </MobileSheet>}
    <CelebrationHost/>
  </div>;
}

function MobileSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Closing in the layout cleanup hands focus back to the menu button.
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => { desktop.removeEventListener("change", closeOnDesktop); if (dialog?.open) dialog.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per mount
  }, []);
  return <dialog ref={ref} aria-label="Menü" className="shell-sheet" onClose={(event) => { if (!event.currentTarget.open) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientY < box.top) onClose(); } }}>
    <div className="flex items-center justify-between"><span className="display text-2xl">Wendico</span><button type="button" onClick={onClose} aria-label="Menü schließen" className="header-icon-button -mr-2"><X size={20}/></button></div>
    {children}
  </dialog>;
}

function ShellSkeleton({ collapsed }: { collapsed: boolean }) {
  return <div className={`workspace-bg min-h-screen ${collapsed ? "shell-sidebar-collapsed" : ""}`}>
    <p role="status" className="sr-only">Wendico wird geladen...</p>
    <div aria-hidden className="shell-sidebar fixed inset-y-0 left-0 hidden md:block"/>
    <div aria-hidden className="shell-main">
      <div className="app-header sticky top-0"/>
      <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 md:px-8 md:pt-9 lg:px-10"><Skeleton className="h-9 w-48"/><Skeleton className="mt-8 h-44 w-full rounded-2xl"/><div className="mt-5 grid gap-5 md:grid-cols-2"><Skeleton className="h-56 rounded-2xl"/><Skeleton className="h-56 rounded-2xl"/></div></div>
    </div>
    <div aria-hidden className="shell-tabbar fixed inset-x-0 bottom-0 md:hidden"/>
  </div>;
}
