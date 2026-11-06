import type { ReactNode } from "react";
import { DeskShell } from "@/features/shell/desk-shell";

export default function Layout({ children }: { children: ReactNode }) {
  return <DeskShell role="Manager">{children}</DeskShell>;
}
