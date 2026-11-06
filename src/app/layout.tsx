import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Figtree } from "next/font/google";
import { Providers } from "@/features/shell/providers";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: "SwishX Academy",
  description: "AI training academy for pharma field teams. Prototype with fictional demo data.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body suppressHydrationWarning><Providers>{children}</Providers></body>
    </html>
  );
}
