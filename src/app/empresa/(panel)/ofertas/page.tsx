import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, Briefcase, Trash2 } from "lucide-react";
import { AvisoUrl } from "@/components/ui/aviso-url";
import { Buscador } from "@/components/ui/buscador";
import { Paginacion } from "@/components/ui/paginacion";
import { PestanasEstado } from "@/components/ui/pestanas-estado";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { Aviso } from "@/components/ui/aviso";
import { Badge } from "@/components/ui/badge";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { bajasDeOfertas } from "@/lib/empresa/bajas-oferta";
import { logError } from "@/lib/logger";
import { limpiarBusqueda, patronIlike } from "@/lib/busqueda";
import {
  consultarPagina,
  hrefConParams,
  leerPagina,
  type ParamsUrl,
} from "@/lib/paginacion";
import { BajaOfertaBtn } from "./_components/baja-oferta-btn";
import { RestaurarOfertaBtn } from "./_components/restaurar-oferta-btn";
import { RenovarOfertaBtn } from "./_components/renovar-oferta-btn";
import { TarjetaOferta } from "./_components/tarjeta-oferta";
import { VencimientoOferta } from "@/components/ofertas/vencimiento-oferta";
import { estadoVencimiento } from "@/lib/ofertas-vencimiento";
import { formatFecha } from "@/lib/fechas";
import {
  diasParaRestaurar,
  DIAS_RESTAURACION_OFERTA,
  ESTADO_OFERTA_EMPRESA_LABEL,
  ESTADO_OFERTA_EMPRESA_TONO,
  type EstadoOfertaEmpresa,
} from "@/lib/oferta-estados";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Mis ofertas | Portal de Empleo Funes",
};

const RUTA = "/empresa/ofertas";

export default async function MisOfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; vista?: string }>;
}) {
  const sp = await searchParams;
  const q = limpiarBusqueda(sp.q);
  const pagina = leerPagina(sp.pagina);
  const eliminadas = sp.vista === "eliminadas";
  const empresa = await requerirEmpresaPagina("/empresa");

  return (
    <section>
      <BotonVolver href="/empresa">Volver al panel</BotonVolver>
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

      <PestanasEstado
        className="mt-6"
        etiqueta="Ofertas"
        pestanas={[
          { href: hrefConParams(RUTA, {}, { q: q || null }), label: "Mis ofertas", activa: !eliminadas },
          {
            href: hrefConParams(RUTA, {}, { vista: "eliminadas", q: q || null }),
            label: "Eliminadas",
            activa: eliminadas,
          },
        ]}
      />

      <Buscador className="mt-4" placeholder="Buscar por título…" />

      <Suspense
        key={JSON.stringify({ q, pagina, eliminadas })}
        fallback={<EsqueletoLista filas={4} className="mt-6" />}
      >
        <ListadoMisOfertas
          empresaId={empresa.id}
          q={q}
          pagina={pagina}
          eliminadas={eliminadas}
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
  eliminadas,
  searchParams,
}: {
  empresaId: string;
  q: string;
  pagina: number;
  eliminadas: boolean;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  const resultado = await consultarPagina(pagina, (desde, hasta) => {
    let query = supabase
      .from("ofertas")
      .select(
        "id, titulo, estado, motivo_rechazo, created_at, vence_en, duracion_dias, eliminada_en, oferta_categorias(categorias(nombre))",
        { count: "exact" }
      )
      .eq("empresa_id", empresaId);
    // Borrado lógico (migration_051): las eliminadas solo se ven en su pestaña.
    query = eliminadas ? query.not("eliminada_en", "is", null) : query.is("eliminada_en", null);
    if (q) query = query.ilike("titulo", patronIlike(q));
    return query
      .order(eliminadas ? "eliminada_en" : "created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta);
  });

  if (!resultado.ok) {
    const ref = logError("empresa_ofertas_listado", resultado.error);
    return <ErrorListado className="mt-6" refError={ref} />;
  }

  const lista = resultado.filas;

  if (lista.length === 0) {
    if (q) {
      return (
        <EstadoVacio
          tipo="sin-resultados"
          className="mt-6"
          titulo="No encontramos ofertas con ese título"
          hrefLimpiar={hrefConParams(RUTA, {}, { vista: eliminadas ? "eliminadas" : null })}
          textoLimpiar="Limpiar búsqueda"
        />
      );
    }
    if (eliminadas) {
      return (
        <EstadoVacio
          tipo="sin-registros"
          className="mt-6"
          icono={Trash2}
          titulo="No tenés ofertas eliminadas"
          descripcion={`Las ofertas que elimines quedan acá y podés restaurarlas durante ${DIAS_RESTAURACION_OFERTA} días.`}
        />
      );
    }
    return (
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

  const paginacion = (
    <Paginacion
      className="mt-6"
      ruta={RUTA}
      searchParams={searchParams}
      pagina={resultado.pagina}
      total={resultado.total}
    />
  );

  if (eliminadas) {
    return (
      <>
        <ul className="mt-6 space-y-3">
          {lista.map((oferta) => {
            const dias = diasParaRestaurar(oferta.eliminada_en!);
            const estadoLabel = ESTADO_OFERTA_EMPRESA_LABEL[oferta.estado] ?? oferta.estado;
            return (
              <TarjetaOferta
                key={oferta.id}
                titulo={oferta.titulo}
                datos={
                  <p className="text-xs text-muted-foreground">
                    Eliminada el {formatFecha(oferta.eliminada_en!)} ·{" "}
                    {dias > 0
                      ? `${dias === 1 ? "queda 1 día" : `quedan ${dias} días`} para restaurarla`
                      : "ya no se puede restaurar"}
                  </p>
                }
                badges={
                  <Badge tono={ESTADO_OFERTA_EMPRESA_TONO[oferta.estado] ?? "neutral"} estado>
                    {estadoLabel}
                  </Badge>
                }
                acciones={
                  dias > 0 && (
                    <RestaurarOfertaBtn
                      ofertaId={oferta.id}
                      ofertaTitulo={oferta.titulo}
                      estadoLabel={estadoLabel}
                    />
                  )
                }
              />
            );
          })}
        </ul>
        {paginacion}
      </>
    );
  }

  const bajas = await bajasDeOfertas(lista);

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
    for (const row of pendientesRows) {
      ofertasConPendientesSet.add(row.oferta_id);
    }
  }

  return (
    <>
        <ul className="mt-6 space-y-3">
          {lista.map((oferta) => {
            const categorias = oferta.oferta_categorias
              .map((oc) => oc.categorias?.nombre)
              .filter((n): n is string => Boolean(n));
            const fecha = formatFecha(oferta.created_at);
            const baja = bajas[oferta.id];
            const { mostrarContinuar, mostrarEditar, mostrarCandidatosPorContactar } = baja.acciones;
            const esBorrador = oferta.estado === "borrador";

            const tienePendientes = mostrarCandidatosPorContactar && ofertasConPendientesSet.has(oferta.id);
            const { vencida } = estadoVencimiento(oferta.estado, oferta.vence_en);
            const estadoVisible: EstadoOfertaEmpresa = vencida ? "vencida" : oferta.estado;

            return (
              <TarjetaOferta
                key={oferta.id}
                titulo={oferta.titulo}
                datos={
                  <>
                    <p className="text-xs text-muted-foreground">
                      {esBorrador ? `Creado el ${fecha}` : `Publicada el ${fecha}`}
                    </p>
                    {categorias.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {categorias.map((cat) => (
                          <EtiquetaRubro key={cat}>{cat}</EtiquetaRubro>
                        ))}
                      </div>
                    )}
                  </>
                }
                badges={
                  <>
                    <Badge tono={ESTADO_OFERTA_EMPRESA_TONO[estadoVisible] ?? "neutral"} estado>
                      {ESTADO_OFERTA_EMPRESA_LABEL[estadoVisible] ?? estadoVisible}
                    </Badge>
                    {tienePendientes && (
                      <Badge tono="warning" estado>
                        Candidatos por contactar
                      </Badge>
                    )}
                  </>
                }
                detalle={
                  oferta.estado === "rechazada" &&
                  oferta.motivo_rechazo && (
                    <Aviso tono="danger">
                      <span className="font-semibold">Motivo del rechazo:</span>{" "}
                      {oferta.motivo_rechazo}
                    </Aviso>
                  )
                }
                info={<VencimientoOferta estado={oferta.estado} venceEn={oferta.vence_en} />}
                acciones={
                  <>
                    <BajaOfertaBtn oferta={oferta} baja={baja} />
                    {mostrarEditar && (
                      <Link
                        href={`/empresa/ofertas/${oferta.id}/editar`}
                        className="btn-secundario inline-flex min-h-11 items-center px-3 text-xs font-medium sm:min-h-9"
                      >
                        Editar
                      </Link>
                    )}
                    {oferta.estado === "activa" && (
                      <Link
                        href={`/empresa/ofertas/${oferta.id}`}
                        className="btn-secundario inline-flex min-h-11 items-center px-3 text-xs font-medium sm:min-h-9"
                      >
                        Ver candidatos
                      </Link>
                    )}
                    {vencida && (
                      <RenovarOfertaBtn
                        ofertaId={oferta.id}
                        ofertaTitulo={oferta.titulo}
                        duracionDias={oferta.duracion_dias}
                      />
                    )}
                    {mostrarContinuar && (
                      <Link
                        href={`/empresa/ofertas/${oferta.id}/editar`}
                        className="btn-primario inline-flex min-h-11 items-center px-3 text-xs sm:min-h-9"
                      >
                        Continuar
                      </Link>
                    )}
                  </>
                }
              />
            );
          })}
        </ul>
      {paginacion}
    </>
  );
}
