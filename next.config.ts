import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

// Solo URLs firmadas del bucket privado "avatares" del proyecto de Supabase
// (ver docs/decisiones/011-imagenes.md). Sin la variable o con un valor
// inválido no se habilita ningún host remoto, pero el build no se rompe.
function patronAvataresFirmados(): RemotePattern[] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  try {
    const { protocol, hostname, port } = new URL(supabaseUrl);
    if (protocol !== "https:" && protocol !== "http:") return [];
    return [
      {
        protocol: protocol === "https:" ? "https" : "http",
        hostname,
        port,
        pathname: "/storage/v1/object/sign/avatares/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: patronAvataresFirmados(),
  },
};

export default nextConfig;
