"use client";

import { useEffect, useRef, useState } from "react";

export type Celebration = { title: string; amount?: number | string };

const DURATION = 2500;
const listeners = new Set<(celebration: Celebration) => void>();

/** Call after a deal was saved as won. Needs <CelebrationHost/>, which the shell mounts. */
export function celebrate(celebration: Celebration) { listeners.forEach((listener) => listener(celebration)); }

function formatAmount(amount: Celebration["amount"]) {
  return typeof amount === "number" ? new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(amount) : amount;
}

export function CelebrationHost() {
  const [current, setCurrent] = useState<(Celebration & { key: number }) | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let key = 0;
    const listener = (celebration: Celebration) => setCurrent({ ...celebration, key: ++key });
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (!current) return;
    // The top layer keeps the toast above an open dialog.
    const element = layer.current;
    if (element?.showPopover && !element.matches(":popover-open")) element.showPopover();
    const timer = window.setTimeout(() => setCurrent(null), DURATION);
    const stop = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !canvas.current ? undefined : burst(canvas.current);
    return () => { window.clearTimeout(timer); stop?.(); };
  }, [current]);

  const amount = formatAmount(current?.amount);
  const detail = current && current.title !== "Deal gewonnen" ? current.title : "";
  return <>
    <p role="status" aria-live="polite" className="sr-only">{current ? ["Deal gewonnen", detail, amount].filter(Boolean).join(", ") : ""}</p>
    {current && <div ref={layer} popover="manual" aria-hidden className="celebration" key={current.key}>
      <canvas ref={canvas} />
      <div className="celebration-toast overlay"><p className="text-sm font-semibold text-[var(--gold)]">Deal gewonnen</p>{amount && <p className="display mt-1 text-4xl">{amount}</p>}{detail && <p className="mt-1 truncate text-sm text-[var(--muted)]">{detail}</p>}</div>
    </div>}
  </>;
}

function burst(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);
  const colors = ["#f1d999", "#d9b66a", "#b98f3f", "#8c6a26"];
  const leaves = Array.from({ length: width < 768 ? 70 : 130 }, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 480;
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 160, size: 3 + Math.random() * 7, spin: Math.random() * 6.3, rate: (Math.random() - .5) * 9, color: colors[index % colors.length] };
  });
  let id = 0;
  let start: number | undefined;
  const draw = (now: number) => {
    start ??= now;
    const t = (now - start) / 1000;
    if (t >= DURATION / 1000) return;
    context.clearRect(0, 0, width, height);
    const drag = (1 - Math.exp(-2.2 * t)) / 2.2;
    context.globalAlpha = Math.min(1, (DURATION / 1000 - t) / .8);
    for (const leaf of leaves) {
      const turn = leaf.spin + leaf.rate * t;
      context.save();
      context.translate(width / 2 + leaf.vx * drag + Math.sin(turn) * 10, height * .3 + leaf.vy * drag + 85 * t * t);
      context.rotate(turn);
      context.scale(1, Math.cos(turn * 1.7));
      context.fillStyle = leaf.color;
      context.beginPath();
      context.moveTo(-leaf.size, 0);
      context.lineTo(0, -leaf.size * .6);
      context.lineTo(leaf.size, leaf.size * .15);
      context.lineTo(-leaf.size * .2, leaf.size * .6);
      context.fill();
      context.restore();
    }
    id = requestAnimationFrame(draw);
  };
  id = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(id);
}
