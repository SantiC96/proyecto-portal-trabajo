"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export type SesionContextValue = {
  nombre: string;
  rol: string | null;
  profileHref: string;
} | null;

const SesionContext = createContext<SesionContextValue>(null);

export function SesionProvider({
  sesion,
  children,
}: {
  sesion: SesionContextValue;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <SesionContext.Provider value={sesion}>{children}</SesionContext.Provider>
  );
}

export function useSesion(): SesionContextValue {
  return useContext(SesionContext);
}
