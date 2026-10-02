import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PerfilForm } from "./perfil-form";

export const metadata: Metadata = {
  title: "Mi perfil | Portal de Empleo Funes",
};

export default async function PerfilPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [
    usuarioResult,
    postulanteResult,
    categoriasResult,
    cvActivoResult,
    avatarActivoResult,
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select("nombre, apellido, telefono, rol")
      .eq("id", user.id)
      .single(),
    supabase
      .from("postulantes")
      .select("id, dni, domicilio, postulante_categorias(categoria_id)")
      .eq("usuario_id", user.id)
      .single(),
    supabase.from("categorias").select("id, nombre").order("nombre"),
    supabase
      .from("archivos_usuario")
      .select("ruta, nombre_original, creado_en, tamano")
      .eq("usuario_id", user.id)
      .eq("tipo", "cv")
      .eq("activo", true)
      .maybeSingle(),
    supabase
      .from("archivos_usuario")
      .select("ruta, nombre_original")
      .eq("usuario_id", user.id)
      .eq("tipo", "avatar")
      .eq("activo", true)
      .maybeSingle(),
  ]);

  if (usuarioResult.error) {
    console.error("[perfil] Error al cargar datos del usuario:", usuarioResult.error);
  }
  if (postulanteResult.error) {
    console.error("[perfil] Error al cargar datos del postulante:", postulanteResult.error);
  }

  const usuario = usuarioResult.data;
  const postulante = postulanteResult.data;
  const categorias = categoriasResult.data ?? [];

  if (!usuario || !postulante) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">Mi perfil</h1>
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="font-semibold">No pudimos cargar tu perfil</p>
            <p className="mt-0.5 text-red-600">Intentá de nuevo más tarde. Si el problema persiste, comunicate con la oficina de empleo.</p>
          </div>
        </div>
      </section>
    );
  }

  const categoriasSeleccionadas =
    postulante?.postulante_categorias?.map(
      (r: { categoria_id: string }) => r.categoria_id
    ) ?? [];

  let avatarUrl: string | null = null;
  if (avatarActivoResult.data?.ruta) {
    const { data: signed } = await supabase.storage
      .from("avatares")
      .createSignedUrl(avatarActivoResult.data.ruta, 3600);
    avatarUrl = signed?.signedUrl ?? null;
  }

  let cvUrl: string | null = null;
  if (cvActivoResult.data?.ruta) {
    const { data: signed } = await supabase.storage
      .from("cvs")
      .createSignedUrl(cvActivoResult.data.ruta, 300);
    cvUrl = signed?.signedUrl ?? null;
  }

  const cvActivo = cvActivoResult.data
    ? {
        ruta: cvActivoResult.data.ruta,
        nombreOriginal: cvActivoResult.data.nombre_original,
        creadoEn: cvActivoResult.data.creado_en,
        tamano: cvActivoResult.data.tamano,
        url: cvUrl,
      }
    : null;

  const avatarActivo = avatarActivoResult.data
    ? {
        ruta: avatarActivoResult.data.ruta,
        url: avatarUrl,
      }
    : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">
        Mi perfil
      </h1>
      <PerfilForm
        usuario={{
          nombre: usuario?.nombre ?? "",
          apellido: usuario?.apellido ?? "",
          telefono: usuario?.telefono ?? "",
          rol: usuario?.rol ?? null,
          avatarActivo,
        }}
        postulante={{
          id: postulante?.id ?? "",
          dni: postulante?.dni ?? "",
          domicilio: postulante?.domicilio ?? "",
          cvActivo,
        }}
        email={user.email ?? ""}
        categorias={categorias}
        categoriasSeleccionadas={categoriasSeleccionadas}
      />
    </section>
  );
}
