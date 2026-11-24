import type { Metadata } from "next";
import type { Viewport } from "next";
import { Bodoni_Moda, Instrument_Sans } from "next/font/google";
import { connection } from "next/server";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

const bodoni = Bodoni_Moda({ subsets: ["latin"], axes: ["opsz"], variable: "--font-bodoni", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "Wendico Buchhaltung",
  description: "Rechnungen, Ausgaben und Belege für Wendico.",
  applicationName: "Wendico Buchhaltung",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Wendico" },
  formatDetection: { telephone: false },
  icons: { icon: "/icon.png?v=2", apple: "/icon.png?v=2" },
};

export const viewport: Viewport = { themeColor: "#070c0a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return <html lang="de" className={`${bodoni.variable} ${instrument.variable}`}><body><PwaRegistration />{children}</body></html>;
}