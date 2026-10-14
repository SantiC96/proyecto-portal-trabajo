import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Briefcase } from "lucide-react";
import { AvisoUrl } from "@/components/ui/aviso-url";
import { Buscador } from "@/components/ui/buscador";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logError } from "@/lib/logger";
import { limpiarBusqueda, patronIlike } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
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

type OfertaRow = {
  id: string;
  titulo: string;
  estado: string;
  motivo_rechazo: string | null;
  created_at: string;
  oferta_categorias: Array<{ categorias: { nombre: string } | null }>;
};

const RUTA = "/empresa/ofertas";

export default async function MisOfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const sp = await searchParams;
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);
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

      <Suspense>
        <AvisoUrl />
      </Suspense>

      <Buscador className="mt-6" placeholder="Buscar por título…" />

      <Suspense
        key={JSON.stringify({ q, pagina })}
        fallback={<EsqueletoLista filas={4} className="mt-6" />}
      >
        <ListadoMisOfertas
          empresaId={empresa.id}
          q={q}
          pagina={pagina}
          searchParams={sp}
        />
      </Suspense>
    </section>
  );
}

async function ListadoMisOfertas({
  empresaId,
  q,
  pagina,
  searchParams,
}: {
  empresaId: string;
  q: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  const resultado = await consultarPagina<OfertaRow>(pagina, (desde, hasta) => {
    let query = supabase
      .from("ofertas")
      .select(
        "id, titulo, estado, motivo_rechazo, created_at, oferta_categorias(categorias(nombre))",
        { count: "exact" }
      )
      .eq("empresa_id", empresaId);
    if (q) query = query.ilike("titulo", patronIlike(q));
    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta)
      .overrideTypes<OfertaRow[], { merge: false }>();
  });

  if (!resultado.ok) {
    const ref = logError("empresa_ofertas_listado", resultado.error);
    return <ErrorListado className="mt-6" refError={ref} />;
  }

  const lista = resultado.filas;

  if (lista.length === 0) {
    return q ? (
      <EstadoVacio
        tipo="sin-resultados"
        className="mt-6"
        titulo="No encontramos ofertas con ese título"
        hrefLimpiar={hrefConParams(RUTA, {})}
        textoLimpiar="Limpiar búsqueda"
      />
    ) : (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={Briefcase}
        titulo="Todavía no publicaste ofertas"
        descripcion="Publicá tu primera oferta para recibir postulaciones."
        accion={
          <Link
            href="/empresa/ofertas/nueva"
            className="btn-primario inline-flex h-11 items-center gap-2 px-4 text-sm"
          >
            <Plus className="h-4 w-4" />
            Publicar oferta
          </Link>
        }
      />
    );
  }

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

  // Ofertas con candidatos "Por contactar" (estado_empresa = 'pendiente')
  // Usamos la función SECURITY DEFINER para no requerir acceso a postulaciones.
  const ofertasConPendientesSet = new Set<string>();
  const { data: pendientesRows } = await supabase
    .rpc("ofertas_con_candidatos_pendientes")
    .in(
      "oferta_id",
      lista.map((o) => o.id)
    );
  if (pendientesRows) {
    for (const row of pendientesRows as Array<{ oferta_id: string }>) {
      ofertasConPendientesSet.add(row.oferta_id);
    }
  }

  return (
    <>
        <ul className="mt-6 space-y-3">
          {lista.map((oferta) => {
            const categorias = oferta.oferta_categorias
              .map((oc) => oc.categorias?.nombre)
              .filter(Boolean) as string[];
            const fecha = formatFecha(oferta.created_at);
            const cantPost = postulacionesPorOferta[oferta.id] ?? 0;
            const puedeEditar = oferta.estado === "activa" || oferta.estado === "rechazada";
            const { mostrarEliminar, mostrarCerrar, mostrarCandidatosPorContactar } = accionesDisponibles(oferta.estado, cantPost);

            const tienePendientes = mostrarCandidatosPorContactar && ofertasConPendientesSet.has(oferta.id);

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
                      {tienePendientes && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Candidatos por contactar
                        </span>
                      )}
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
                    {oferta.estado === "activa" && (
                      <Link
                        href={`/empresa/ofertas/${oferta.id}`}
                        className="btn-secundario inline-flex h-8 items-center px-3 text-xs font-medium"
                      >
                        Ver candidatos
                      </Link>
                    )}
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
      <Paginacion
        className="mt-6"
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </>
  );
}
