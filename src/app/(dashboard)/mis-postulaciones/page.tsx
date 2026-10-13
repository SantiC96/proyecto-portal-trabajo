import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MisPostulacionesLista } from "./mis-postulaciones-lista";

export const metadata: Metadata = {
  title: "Mis postulaciones | Portal de Empleo Funes",
};

type DbPostulacion = {
  id: string;
  estado: "recibida" | "en_revision" | "derivada" | "rechazada_municipalidad";
  created_at: string;
  ofertas: {
    id: string;
    titulo: string;
    empresa_nombre: string;
    estado: string;
    contenido_editado_en: string | null;
  } | null;
};

export default async function MisPostulacionesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "postulante") {
    if (usuario?.rol === "empresa") redirect("/empresa");
    if (usuario?.rol === "municipalidad") redirect("/admin");
    redirect("/");
  }

  const { data: postulante } = await supabase
    .from("postulantes")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!postulante) redirect("/");

  // LEFT JOIN a ofertas: las ofertas cerradas no son visibles al postulante vía RLS
  // (no se puede agregar política porque migration_014 las reserva).
  // La UI muestra "Oferta no disponible" cuando oferta es null.
  const postulacionesRes = await supabase
    .from("postulaciones")
    .select(
      "id, estado, created_at, ofertas(id, titulo, empresa_nombre, estado, contenido_editado_en)"
    )
    .eq("postulante_id", postulante.id)
    .order("created_at", { ascending: false });

  const rawList = (postulacionesRes.data ?? []) as unknown as DbPostulacion[];

  // For derivada postulaciones, get the derivation state (without notes — uses SECURITY DEFINER)
  const derivadasIds = rawList
    .filter((r) => r.estado === "derivada")
    .map((r) => r.id);

  type EstadoDerivacionRow = {
    estado_empresa: string;
    fecha_entrevista: string | null;
    lugar_entrevista: string | null;
  };

  const derivacionEstados: Record<string, EstadoDerivacionRow> = {};
  if (derivadasIds.length > 0) {
    const results = await Promise.all(
      derivadasIds.map((pid) =>
        supabase.rpc("estado_derivacion_postulante", { p_postulacion_id: pid })
      )
    );
    derivadasIds.forEach((pid, i) => {
      const row = (results[i].data as EstadoDerivacionRow[] | null)?.[0];
      if (row) derivacionEstados[pid] = row;
    });
  }

  const postulaciones = rawList.map((r) => ({
    id: r.id,
    estado: r.estado,
    created_at: r.created_at,
    oferta: r.ofertas,
    derivacion: derivacionEstados[r.id] ?? null,
  }));

  return (
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-10">
        {/* Postulaciones */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mis postulaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seguí el estado de cada postulación que enviaste.
          </p>

          <div className="mt-6">
            {postulaciones.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-white py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Briefcase className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    Todavía no te postulaste a ninguna oferta
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Explorá las búsquedas activas y encontrá tu próximo trabajo.
                  </p>
                </div>
                <Link
                  href="/ofertas"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover"
                >
                  Ver ofertas laborales
                </Link>
              </div>
            ) : (
              <MisPostulacionesLista postulaciones={postulaciones} />
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
