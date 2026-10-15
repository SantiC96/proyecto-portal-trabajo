"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { Rol } from "@/types/db";

export type SesionContextValue = {
  nombre: string;
  rol: Rol | null;
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
    const supabase = createSupabaseBrowserClient();

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
