import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "WendApply", description: "Your job search, organized." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}