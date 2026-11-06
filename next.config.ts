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
    ];
  },
};

export default nextConfig;
