import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Figtree, Urbanist } from "next/font/google";
import { Providers } from "@/features/shell/providers";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
/* The rep app's face (freud-derived theme, see globals.css [data-app="rep"]). */
const urbanist = Urbanist({ subsets: ["latin"], variable: "--font-urbanist", display: "swap" });

export const metadata: Metadata = {
  title: "SwishX Academy",
  description: "AI training academy for pharma field teams. Prototype with fictional demo data.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${urbanist.variable}`}>
      <body suppressHydrationWarning><Providers>{children}</Providers></body>
    </html>
  );
}
