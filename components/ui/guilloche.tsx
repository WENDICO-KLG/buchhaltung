import { useId } from "react";
import { cn } from "@/lib/utils";

// Each band is one closed wave; rotated copies of it make the engraved weave.
const bands = [
  { radius: 148, swing: 44, lobes: 18, copies: 8 },
  { radius: 92, swing: 34, lobes: 12, copies: 8 },
  { radius: 40, swing: 24, lobes: 8, copies: 7 },
].map((band) => {
  const steps = band.lobes * 14;
  const points = Array.from({ length: steps }, (_, step) => {
    const angle = step / steps * Math.PI * 2;
    const r = band.radius + band.swing * Math.sin(angle * band.lobes);
    return `${(r * Math.cos(angle)).toFixed(1)} ${(r * Math.sin(angle)).toFixed(1)}`;
  });
  return { ...band, d: `M${points.join("L")}Z` };
});

/** Banknote rosette. Position and size it with className, e.g. "absolute -right-24 -top-24 w-[34rem]". */
export function Guilloche({ className }: { className?: string }) {
  const id = useId();
  return <svg aria-hidden focusable="false" viewBox="-200 -200 400 400" fill="none" stroke="currentColor" strokeWidth=".5" strokeLinejoin="round" className={cn("guilloche", className)}>
    {bands.map(({ d, lobes, copies }, index) => <g key={lobes}>
      <path id={`${id}-${index}`} d={d} />
      {Array.from({ length: copies - 1 }, (_, copy) => <use key={copy} href={`#${id}-${index}`} transform={`rotate(${(360 / lobes * (copy + 1) / copies).toFixed(3)})`} />)}
    </g>)}
  </svg>;
}
