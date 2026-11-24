"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./form-dialog.module.css";

/** Side panel on desktop, bottom sheet on mobile. Mount it to open, unmount it to close. */
export function FormDialog({ title, error, submitLabel, onSubmit, onClose, children }: { title: string; error?: string; submitLabel: string; onSubmit: (event: React.FormEvent) => void; onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const alert = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLInputElement>("input, select, textarea")?.focus({ preventScroll: true });
    return () => { if (element?.open) element.close(); };
  }, []);
  useEffect(() => { if (error) alert.current?.scrollIntoView({ block: "nearest" }); }, [error]);
  return <dialog ref={dialog} aria-label={title} className={`${styles.dialog} overlay`} onClose={(event) => { if (!event.currentTarget.open) onClose(); }}>
    <form onSubmit={onSubmit} className="flex h-full max-h-[inherit] flex-col">
      <div className="flex flex-none items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3 sm:px-7 sm:py-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Schliessen" className="header-icon-button -mr-2"><X size={20}/></button>
      </div>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
        {error && <div ref={alert}><ErrorNote>{error}</ErrorNote></div>}
        {children}
      </div>
      <div className={`${styles.footer} flex flex-none gap-2 border-t border-[var(--line)] px-5 pt-4 sm:px-7`}>
        <button className="primary max-sm:flex-1">{submitLabel}</button>
        <button type="button" onClick={onClose} className="action">Abbrechen</button>
      </div>
    </form>
  </dialog>;
}

export function ErrorNote({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div role="alert" className={`rounded-xl bg-[var(--coral-soft)] px-4 py-3 text-sm text-[var(--coral)] ${className}`}>{children}</div>;
}

export function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="min-w-0">
    <legend className="mb-3 text-base font-semibold">{title}</legend>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </fieldset>;
}

export const fieldLabel = "mb-1.5 block text-[13px] text-[var(--muted)]";

export function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="flex min-w-0 flex-col justify-end"><span className={fieldLabel}>{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field"/></label>;
}
