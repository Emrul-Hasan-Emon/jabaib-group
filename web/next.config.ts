import type { NextConfig } from "next";

// Product/banner/review media is served either from the NestJS API's upload
// root (local disk) or directly from the S3 bucket (see src/lib/media-url.ts)
// — next/image needs whichever origin is actually in play allow-listed.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL(`${apiUrl}/**`),
      ...(storageUrl ? [new URL(`${storageUrl}/**`)] : []),
    ],
    // The dev API runs on localhost, which Next's image optimizer otherwise
    // refuses as a private-IP SSRF guard. Safe here: the pattern above is
    // pinned to our own configured API origin, not an attacker-chosen host.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    // Catalog media is uploaded artwork and currently ships as SVG, which the
    // optimizer rejects by default (every product/banner image would 400).
    // Allowed with Next's documented hardening CSP for the optimizer route:
    // the images come from our own upload folder, not from user input.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
