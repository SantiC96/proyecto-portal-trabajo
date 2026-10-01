import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logout } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Inicio | Portal de Empleo Funes",
};

export default async function InicioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nombre = (user?.user_metadata?.nombre as string) ?? "";
  const apellido = (user?.user_metadata?.apellido as string) ?? "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f8f4] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#d8ddd7] bg-white px-8 py-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[#1b2926]">
          Bienvenido/a, {nombre} {apellido}
        </h1>
        <p className="mt-2 text-sm text-[#6e7772]">
          Portal de Empleo · Municipalidad de Funes
        </p>
        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center rounded-lg border border-[#d8ddd7] bg-white text-sm font-medium text-[#4f5a54] shadow-sm transition hover:bg-[#f8f8f4] hover:text-[#1b2926]"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
