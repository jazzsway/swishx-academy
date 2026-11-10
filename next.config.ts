import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  /* Admin became the trainer's Settings; keep old links working. */
  async redirects() {
    return [
      { source: "/admin", destination: "/trainer/settings", permanent: true },
      { source: "/admin/settings", destination: "/trainer/settings/compliance", permanent: true },
      { source: "/admin/:path*", destination: "/trainer/settings/:path*", permanent: true },
      /* v1-hidden: these pages are kept in the code but switched off for v1. Delete a line to bring a page back. */
      ...[
        ["/trainer/campaigns", "/trainer"], ["/trainer/campaigns/:path*", "/trainer"],
        ["/trainer/library", "/trainer/analytics"],
        ["/trainer/verify", "/trainer/records"], ["/trainer/verify/:path*", "/trainer/records"],
        ["/trainer/settings/compliance", "/trainer/settings"],
        ["/trainer/courses/:id/preview", "/trainer/courses/:id"],
        ["/manager", "/trainer"], ["/manager/:path*", "/trainer"],
        ["/rep/library", "/rep/learn"], ["/rep/library/:path*", "/rep/learn"], ["/rep/watch/:path*", "/rep/learn"],
        ["/rep/practice/quiz", "/rep/practice"], ["/rep/practice/flashcards", "/rep/practice"],
      ].map(([source, destination]) => ({ source, destination, permanent: false })),
    ];
  },
};

export default nextConfig;
