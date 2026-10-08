import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Briefcase } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CerrarOfertaBtn } from "./_components/cerrar-oferta-btn";
import { EliminarEnvioBtn } from "./_components/eliminar-envio-btn";
import { formatFecha } from "@/lib/fechas";
import { accionesDisponibles } from "@/lib/oferta-estados";

export const metadata: Metadata = {
  title: "Mis ofertas | Portal de Empleo Funes",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente_aprobacion: "Pendiente de revisión",
  activa: "Publicada",
  rechazada: "Rechazada",
  cerrada: "Cerrada",
  borrador: "Borrador",
};

const ESTADO_STYLE: Record<string, string> = {
  pendiente_aprobacion: "bg-amber-100 text-amber-800",
  activa: "bg-emerald-100 text-emerald-800",
  rechazada: "bg-red-100 text-red-700",
  cerrada: "bg-gray-100 text-gray-600",
  borrador: "bg-gray-100 text-gray-500",
};

interface Props {
  searchParams: Promise<{ aviso?: string }>;
}

type OfertaRow = {
  id: string;
  titulo: string;
  estado: string;
  motivo_rechazo: string | null;
  created_at: string;
  oferta_categorias: Array<{ categorias: { nombre: string } | null }>;
};

export default async function MisOfertasPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) redirect("/empresa");

  const { data: ofertas } = await supabase
    .from("ofertas")
    .select(
      "id, titulo, estado, motivo_rechazo, created_at, oferta_categorias(categorias(nombre))"
    )
    .eq("empresa_id", empresa.id)
    .order("created_at", { ascending: false });

  const lista = (ofertas ?? []) as unknown as OfertaRow[];

  // Contar postulaciones de ofertas pendientes para mostrar/ocultar "Eliminar envío".
  // Usar supabaseAdmin porque empresa no tiene SELECT en postulaciones.
  const pendingIds = lista
    .filter((o) => o.estado === "pendiente_aprobacion")
    .map((o) => o.id);

  const postulacionesPorOferta: Record<string, number> = {};
  if (pendingIds.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from("postulaciones")
      .select("oferta_id")
      .in("oferta_id", pendingIds);
    if (rows) {
      for (const row of rows) {
        postulacionesPorOferta[row.oferta_id] = (postulacionesPorOferta[row.oferta_id] ?? 0) + 1;
      }
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis ofertas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestioná las ofertas laborales de tu empresa.
          </p>
        </div>
        <Link
          href="/empresa/ofertas/nueva"
          className="btn-primario inline-flex h-10 items-center gap-2 px-4 text-sm"
        >
          <Plus className="h-4 w-4" />
          Publicar oferta
        </Link>
      </div>

      {params.aviso === "enviada" && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Tu oferta se envió a revisión. La Oficina de Empleo la revisará pronto.
        </div>
      )}

      {params.aviso === "pendiente" && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La oferta está en revisión. Vas a poder editarla cuando la oficina responda.
        </div>
      )}

      {params.aviso === "eliminada" && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          El envío fue eliminado exitosamente.
        </div>
      )}

      {lista.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Todavía no publicaste ofertas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Publicá tu primera oferta para recibir postulaciones.
            </p>
          </div>
          <Link
            href="/empresa/ofertas/nueva"
            className="btn-primario inline-flex h-10 items-center gap-2 px-4 text-sm"
          >
            <Plus className="h-4 w-4" />
            Publicar oferta
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {lista.map((oferta) => {
            const categorias = oferta.oferta_categorias
              .map((oc) => oc.categorias?.nombre)
              .filter(Boolean) as string[];
            const fecha = formatFecha(oferta.created_at);
            const cantPost = postulacionesPorOferta[oferta.id] ?? 0;
            const puedeEditar = oferta.estado === "activa" || oferta.estado === "rechazada";
            const { mostrarEliminar, mostrarCerrar } = accionesDisponibles(oferta.estado, cantPost);

            return (
              <li
                key={oferta.id}
                className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-xs sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">{oferta.titulo}</h2>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_STYLE[oferta.estado] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {ESTADO_LABEL[oferta.estado] ?? oferta.estado}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">Publicada el {fecha}</p>

                    {categorias.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {categorias.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {oferta.estado === "rechazada" && oferta.motivo_rechazo && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <span className="font-semibold">Motivo del rechazo:</span>{" "}
                        {oferta.motivo_rechazo}
                      </div>
                    )}

                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {puedeEditar && (
                      <Link
                        href={`/empresa/ofertas/${oferta.id}/editar`}
                        className="btn-secundario inline-flex h-8 items-center px-3 text-xs font-medium"
                      >
                        Editar
                      </Link>
                    )}
                    {mostrarEliminar && (
                      <EliminarEnvioBtn
                        ofertaId={oferta.id}
                        ofertaTitulo={oferta.titulo}
                      />
                    )}
                    {mostrarCerrar && (
                      <CerrarOfertaBtn
                        ofertaId={oferta.id}
                        ofertaTitulo={oferta.titulo}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
