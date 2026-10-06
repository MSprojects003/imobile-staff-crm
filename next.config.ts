import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "odotvxrmrnqgrbrxogqh.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/categories/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "odotvxrmrnqgrbrxogqh.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/products/**",
        search: "",
      },
    ],
  },
}

export default nextConfig
