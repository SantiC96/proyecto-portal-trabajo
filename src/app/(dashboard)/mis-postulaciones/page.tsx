import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerPostulanteActual, requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { MisPostulacionesLista, type Postulacion } from "./mis-postulaciones-lista";
import type {
  FilaCvDeMiPostulacion,
  FilaEstadoDerivacionPostulante,
  FilaMiPreEntrevista,
} from "@/types/db";
import { AvisoCursoPendiente } from "@/components/cursos/aviso-curso-pendiente";
import { BotonVolver } from "@/components/ui/boton-volver";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";

export const metadata: Metadata = {
  title: "Mis postulaciones | Portal de Empleo Funes",
};

const RUTA = "/mis-postulaciones";

export default async function MisPostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);
  await requerirRolPagina("postulante");
  const postulante = await obtenerPostulanteActual();
  if (!postulante) redirect("/");

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-10">
        <BotonVolver href="/perfil">Volver a mi perfil</BotonVolver>
        {/* Postulaciones */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Mis postulaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seguí el estado de cada postulación que enviaste.
          </p>

          <Suspense fallback={null}>
            <AvisoCursoPendiente className="mt-6" />
          </Suspense>

          <Suspense
            key={pagina}
            fallback={<EsqueletoLista filas={3} className="mt-6" />}
          >
            <ListadoMisPostulaciones
              postulanteId={postulante.id}
              pagina={pagina}
              searchParams={sp}
            />
          </Suspense>
        </div>

      </div>
    </section>
  );
}

async function ListadoMisPostulaciones({
  postulanteId,
  pagina,
  searchParams,
}: {
  postulanteId: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  // LEFT JOIN a ofertas: las ofertas cerradas no son visibles al postulante vía RLS
  // (no se puede agregar política porque migration_014 las reserva).
  // La UI muestra "Oferta no disponible" cuando oferta es null.
  const resultado = await consultarPagina(pagina, (desde, hasta) =>
    supabase
      .from("postulaciones")
      .select(
        "id, estado, created_at, retirada_en, ofertas(id, titulo, empresa_nombre, estado, vence_en, contenido_editado_en)",
        { count: "exact" }
      )
      .eq("postulante_id", postulanteId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta)
  );

  if (!resultado.ok) {
    const ref = logError("mis_postulaciones_listado", resultado.error);
    return (
      <ErrorListado
        className="mt-6"
        mensaje="No pudimos cargar tus postulaciones. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const rawList = resultado.filas;

  if (rawList.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={Briefcase}
        titulo="Todavía no te postulaste a ninguna oferta"
        descripcion="Explorá las búsquedas activas y encontrá tu próximo trabajo."
        accion={
          <Link
            href="/ofertas"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover"
          >
            Ver ofertas laborales
          </Link>
        }
      />
    );
  }

  // For derivada postulaciones, get the derivation state (without notes — uses SECURITY DEFINER)
  const derivadasIds = rawList
    .filter((r) => r.estado === "derivada")
    .map((r) => r.id);

  const derivacionEstados: Record<string, FilaEstadoDerivacionPostulante> = {};
  if (derivadasIds.length > 0) {
    const results = await Promise.all(
      derivadasIds.map((pid) =>
        supabase.rpc("estado_derivacion_postulante", { p_postulacion_id: pid })
      )
    );
    derivadasIds.forEach((pid, i) => {
      const row = results[i].data?.[0];
      if (row) derivacionEstados[pid] = row;
    });
  }

  // Pre-entrevista con la oficina de las postulaciones pendientes, sin la
  // nota interna (mis_pre_entrevistas, migration_044).
  const pendientesIds = rawList
    .filter((r) => r.estado === "recibida" || r.estado === "en_revision")
    .map((r) => r.id);

  const preEntrevistas: Record<string, FilaMiPreEntrevista> = {};
  if (pendientesIds.length > 0) {
    const { data, error } = await supabase.rpc("mis_pre_entrevistas", {
      p_postulacion_ids: pendientesIds,
    });
    if (error) logError("mis_pre_entrevistas", error);
    for (const fila of data ?? []) preEntrevistas[fila.postulacion_id] = fila;
  }

  // Con qué CV se postuló (migration_054): nombre y fecha aunque después lo
  // haya eliminado de su perfil.
  const cvsPorPostulacion: Record<string, FilaCvDeMiPostulacion> = {};
  {
    const { data, error } = await supabase.rpc("cvs_de_mis_postulaciones", {
      p_postulacion_ids: rawList.map((r) => r.id),
    });
    if (error) logError("cvs_de_mis_postulaciones", error);
    for (const fila of data ?? []) cvsPorPostulacion[fila.postulacion_id] = fila;
  }

  // Postulaciones retiradas (migration_053): se puede volver a postular si la
  // oferta sigue abierta y no hay ya otra postulación vigente a esa oferta
  // (puede estar en otra página del listado).
  const ofertaAbierta = (o: (typeof rawList)[number]["ofertas"]) =>
    o?.estado === "activa" && o.vence_en != null && !estadoVencimiento(o.estado, o.vence_en).vencida;

  const ofertasRetiradasAbiertas = [
    ...new Set(
      rawList
        .filter((r) => r.retirada_en != null && ofertaAbierta(r.ofertas))
        .map((r) => r.ofertas!.id)
    ),
  ];

  const ofertasConVigente = new Set<string>();
  if (ofertasRetiradasAbiertas.length > 0) {
    const { data, error } = await supabase
      .from("postulaciones")
      .select("oferta_id")
      .eq("postulante_id", postulanteId)
      .is("retirada_en", null)
      .in("oferta_id", ofertasRetiradasAbiertas);
    if (error) logError("mis_postulaciones_vigentes", error);
    for (const fila of data ?? []) ofertasConVigente.add(fila.oferta_id);
  }

  const postulaciones: Postulacion[] = rawList.map((r) => ({
    id: r.id,
    estado: r.estado,
    created_at: r.created_at,
    retirada_en: r.retirada_en,
    oferta: r.ofertas,
    derivacion: derivacionEstados[r.id] ?? null,
    preEntrevista: preEntrevistas[r.id] ?? null,
    cv: cvsPorPostulacion[r.id] ?? null,
    puedeVolverAPostularse:
      r.retirada_en != null &&
      ofertaAbierta(r.ofertas) &&
      !ofertasConVigente.has(r.ofertas!.id),
  }));

  return (
    <div className="mt-6 space-y-6">
      <MisPostulacionesLista postulaciones={postulaciones} />
      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </div>
  );
}
