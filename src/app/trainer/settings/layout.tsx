"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PageHeading } from "@/components/patterns/page-heading";
import { TabNav } from "@/components/patterns/tab-nav";

const TABS = [
  { id: "org", label: "Organisation", href: "/trainer/settings" },
  { id: "people", label: "People", href: "/trainer/settings/people" },
  { id: "products", label: "Products", href: "/trainer/settings/products" },
  { id: "competencies", label: "Competencies", href: "/trainer/settings/competencies" },
  { id: "compliance", label: "Privacy & consent", href: "/trainer/settings/compliance" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = TABS.find((t) => t.href !== "/trainer/settings" && pathname.startsWith(t.href))?.id ?? "org";
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Settings" description="Your organisation, people, products and compliance defaults." />
      <TabNav ariaLabel="Settings sections" items={TABS} activeId={active} className="self-start max-w-full" />
      <div>{children}</div>
    </div>
  );
}
