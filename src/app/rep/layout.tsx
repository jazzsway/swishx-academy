import type { ReactNode } from "react";
import { RepShell } from "@/features/shell/rep-shell";

export default function Layout({ children }: { children: ReactNode }) {
  return <RepShell>{children}</RepShell>;
}
