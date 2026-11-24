import type { Metadata } from "next";
import type { Viewport } from "next";
import { Poppins } from "next/font/google";
import { connection } from "next/server";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: "Wendico Buchhaltung",
  description: "Rechnungen, Ausgaben und Belege für Wendico.",
  applicationName: "Wendico Buchhaltung",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Wendico" },
  formatDetection: { telephone: false },
  icons: { icon: "/icon.png?v=2", apple: "/icon.png?v=2" },
};

export const viewport: Viewport = { themeColor: "#050505", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return <html lang="de" className={poppins.variable}><body><PwaRegistration />{children}</body></html>;
}