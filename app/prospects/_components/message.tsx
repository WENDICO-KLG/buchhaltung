"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Prospect } from "@/types";

/** Reply of the lead: plain text, three lines until opened. */
export function Message({ prospect }: { prospect: Prospect }) {
  const text = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const element = text.current;
    if (!element || open) return;
    const observer = new ResizeObserver(() => setLong(element.scrollHeight > element.clientHeight + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, [open, prospect.message]);
  return <div className="col-span-full min-w-0 max-w-[75ch] text-sm xl:order-6">
    <MessageHeading at={prospect.messageAt}/>
    <p ref={text} id={id} className={`mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] ${open ? "" : "line-clamp-3"}`}>{prospect.message}</p>
    {long && <button type="button" aria-expanded={open} aria-controls={id} aria-label={`Nachricht von ${prospect.companyName} ${open ? "einklappen" : "ganz anzeigen"}`} onClick={() => setOpen(!open)} className="min-h-11 text-[13.5px] font-medium text-[var(--muted)] underline underline-offset-4 hover:text-[var(--ink)]">{open ? "Weniger anzeigen" : "Ganz anzeigen"}</button>}
  </div>;
}

export function MessageHeading({ at }: { at?: string }) {
  return <p className="text-[13.5px] text-[var(--muted)]">Nachricht{at && <span className="money"> vom {new Date(at).toLocaleDateString("de-CH")}</span>}</p>;
}
