import type { Metadata } from "next";
import type { Viewport } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wendico Buchhaltung",
  description: "Rechnungen, Ausgaben und Belege für Wendico.",
  applicationName: "Wendico Buchhaltung",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Wendico" },
  formatDetection: { telephone: false },
  icons: { icon: "/icon.png?v=2", apple: "/icon.png?v=2" },
};

export const viewport: Viewport = { themeColor: "#13263a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body><PwaRegistration />{children}</body></html>;
}