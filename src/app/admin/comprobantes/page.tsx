import type { Metadata } from "next";
import { LABEL_PESTANA, COLUMNAS_TABLA } from "./listado";
import { Suspense } from "react";
import { ExternalLink, FileCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { consultarPagina, hrefConParams, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import {
  SEGUNDOS_URL_COMPROBANTE_OFICINA,
  urlsFirmadasDeComprobantes,
} from "@/lib/comprobantes";
import {
  PESTANAS_COMPROBANTES,
  aplicarFiltroComprobantes,
  leerPestanaComprobantes,
  type PestanaComprobantes,
} from "@/lib/admin/filtro-comprobantes";
import { nivelDe } from "@/lib/procedencia";
import { inicialesDePersona } from "@/lib/iniciales";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { formatNumero } from "@/components/indicadores/formato";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { PastillaFiltro } from "@/components/ui/pastilla-filtro";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoComprobantes } from "./esqueleto";
import { RevisarComprobante } from "@/components/admin/revisar-comprobante";
import { ChipLocalidad } from "@/components/postulantes/badge-procedencia";
import { Badge } from "@/components/ui/badge";
import { CeldaPersona, FilaTabla, Tabla } from "@/components/ui/tabla";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Comprobantes | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/comprobantes";

const COLUMNAS =
  "id, ruta, creado_en, verificacion_estado, verificacion_motivo, verificado_en, usuarios!usuario_id(nombre, apellido, postulantes(id, dni, localidad, domicilio, nivel_prioridad)), revisor:usuarios!verificado_por(nombre, apellido)" as const;

// Filete izquierdo de la fila: el color del estado del comprobante.
const FILETE = {
  pendiente: "before:bg-accent",
  aprobado: "before:bg-primary",
  rechazado: "before:bg-danger",
} as const;

// Rótulo de un dato que en la tarjeta del celular se ve y en la tabla queda para el lector de pantalla.
const ROTULO_TARJETA = "text-sm font-bold text-neutral @4xl:sr-only";

export default async function ComprobantesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const pestana = leerPestanaComprobantes(sp.estado);
  const pagina = leerPagina(sp.pagina);

  const supabase = await createSupabaseServerClient();
  // Mismo filtro que la lista. Al revisar uno, router.refresh() vuelve a
  // pedirlas y los números cambian.
  const conteos = await Promise.all(
    PESTANAS_COMPROBANTES.map((p) =>
      aplicarFiltroComprobantes(
        supabase.from("archivos_usuario").select("id", { count: "exact", head: true }),
        p,
      ),
    ),
  );
  conteos.forEach(({ error }, i) => {
    if (error) logError("admin_comprobantes_contador", error, { pestana: PESTANAS_COMPROBANTES[i] });
  });
  const cantidades = Object.fromEntries(
    PESTANAS_COMPROBANTES.map((p, i) => [p, conteos[i].count ?? 0]),
  ) as Record<PestanaComprobantes, number>;
  const total = cantidades[pestana];

  return (
    <section className="flex flex-col gap-6">
      <BotonVolver href="/admin" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        botonesBlancos
        titulo="Comprobantes de domicilio"
        bajada="Al aprobarlo, el postulante pasa a «De Funes verificado»."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <nav aria-label="Estado de los comprobantes" className="min-w-0">
          <div className="sin-barra-scroll -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {PESTANAS_COMPROBANTES.map((p) => (
              <PastillaFiltro
                key={p}
                href={p === "por-revisar" ? RUTA : hrefConParams(RUTA, {}, { estado: p })}
                activa={p === pestana}
                cantidad={cantidades[p]}
              >
                {LABEL_PESTANA[p]}
              </PastillaFiltro>
            ))}
          </div>
        </nav>
        <p className="shrink-0 text-sm font-semibold text-muted-foreground-strong tabular-nums" aria-live="polite">
          {total === 1 ? "1 comprobante" : `${formatNumero(total)} comprobantes`}
        </p>
      </div>

      <Suspense key={JSON.stringify({ pestana, pagina })} fallback={<EsqueletoComprobantes />}>
        <ListadoComprobantes pestana={pestana} pagina={pagina} searchParams={sp} />
      </Suspense>
    </section>
  );
}

async function ListadoComprobantes({
  pestana,
  pagina,
  searchParams,
}: {
  pestana: PestanaComprobantes;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();
  const porRevisar = pestana === "por-revisar";

  // Por revisar: el más viejo primero. Revisados: el más reciente primero.
  const resultado = await consultarPagina(pagina, (desde, hasta) => {
    const query = aplicarFiltroComprobantes(
      supabase.from("archivos_usuario").select(COLUMNAS, { count: "exact" }),
      pestana,
    );
    return porRevisar
      ? query
          .order("creado_en", { ascending: true })
          .order("id", { ascending: true })
          .range(desde, hasta)
      : query
          .order("verificado_en", { ascending: false })
          .order("id", { ascending: false })
          .range(desde, hasta);
  });

  if (!resultado.ok) {
    const ref = logError("admin_comprobantes_listado", resultado.error, { pestana });
    return <ErrorListado refError={ref} />;
  }

  const filas = resultado.filas;
  if (filas.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        icono={FileCheck}
        titulo={
          porRevisar ? "No hay comprobantes para revisar." : "Todavía no hay comprobantes revisados."
        }
      />
    );
  }

  // Una sola llamada a Storage para toda la página; las URLs duran lo mismo
  // que en la ficha del postulante.
  const urls = await urlsFirmadasDeComprobantes(
    supabase,
    filas.map((f) => f.ruta),
    SEGUNDOS_URL_COMPROBANTE_OFICINA,
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabla
        columnas={COLUMNAS_TABLA}
        etiqueta={porRevisar ? "Comprobantes por revisar" : "Comprobantes revisados"}
        semantica="tabla"
        encabezados={[
          "Postulante",
          "Localidad",
          "Domicilio declarado",
          "Cargado el",
          "Comprobante",
          porRevisar ? (
            <span key="a" className="sr-only">
              Acciones
            </span>
          ) : (
            <span key="r" className="block text-right">
              Resultado
            </span>
          ),
        ]}
      >
        {filas.map((f) => {
          const usuario = f.usuarios;
          const postulante = usuario?.postulantes ?? null;
          const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : "—";
          const iniciales = usuario ? inicialesDePersona(usuario.nombre, usuario.apellido) : undefined;
          const url = urls.get(f.ruta) ?? null;
          const rechazado = f.verificacion_estado === "rechazado";
          const filete = porRevisar ? FILETE.pendiente : rechazado ? FILETE.rechazado : FILETE.aprobado;
          const cargadoEl = formatFecha(f.creado_en);

          return (
            <FilaTabla key={f.id} semantica="tabla" filete={filete}>
              <div role="cell" className="min-w-0">
                <CeldaPersona
                  nombre={nombre}
                  href={postulante ? `/admin/postulantes/${postulante.id}` : undefined}
                  iniciales={iniciales}
                  secundario={`DNI ${postulante?.dni ?? "—"}`}
                />
              </div>

              <div role="cell" className="min-w-0">
                <span className="sr-only">Localidad: </span>
                {postulante ? (
                  <ChipLocalidad
                    nivel={nivelDe(postulante.nivel_prioridad)}
                    localidad={postulante.localidad}
                  />
                ) : (
                  "—"
                )}
              </div>

              <div role="cell" className="min-w-0 break-words">
                <span className={ROTULO_TARJETA}>Domicilio declarado </span>
                <span className="block @4xl:inline">
                  {postulante?.domicilio || (
                    <span className="text-muted-foreground">Sin informar</span>
                  )}
                </span>
              </div>

              <div role="cell" className="whitespace-nowrap tabular-nums">
                <span className={ROTULO_TARJETA}>Cargado el </span>
                {cargadoEl}
              </div>

              {/* Comprobante: link en la tabla, botón a todo el ancho en la tarjeta. */}
              <div role="cell" className="min-w-0">
                {url ? (
                  <>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-neutro w-full @4xl:hidden"
                    >
                      Ver comprobante
                      <ExternalLink aria-hidden="true" />
                      <span className="sr-only">de {nombre} (se abre en otra pestaña)</span>
                    </a>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] text-[15px] font-bold whitespace-nowrap text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)] @4xl:inline-flex"
                    >
                      <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
                      Ver comprobante
                      <span className="sr-only">de {nombre} (se abre en otra pestaña)</span>
                    </a>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">El archivo no está disponible.</span>
                )}
              </div>

              {porRevisar ? (
                <div role="cell" className="min-w-0">
                  <RevisarComprobante
                    archivoId={f.id}
                    postulante={{ nombre, iniciales, dni: postulante?.dni ?? null, cargadoEl }}
                    rechazarConBorde
                    className="grid grid-cols-2 gap-2 @4xl:flex @4xl:flex-nowrap @4xl:justify-end"
                    claseBoton="w-full px-3! @4xl:w-auto @4xl:min-h-10! @4xl:text-sm!"
                  />
                </div>
              ) : (
                <div
                  role="cell"
                  className="flex min-w-0 flex-col items-start gap-1 @4xl:items-end @4xl:text-right"
                >
                  <Badge tono={rechazado ? "danger" : "success"} estado>
                    {rechazado ? "Rechazado" : "Aprobado"}
                  </Badge>
                  <span className="text-[13px] text-muted-foreground">
                    {formatFechaHora(f.verificado_en)}
                    {f.revisor ? ` · por ${f.revisor.nombre} ${f.revisor.apellido}` : ""}
                  </span>
                  {rechazado && f.verificacion_motivo && (
                    <span className="text-sm whitespace-pre-line break-words text-danger">
                      Motivo: {f.verificacion_motivo}
                    </span>
                  )}
                </div>
              )}
            </FilaTabla>
          );
        })}
      </Tabla>

      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
        variante="numeros"
      />
    </div>
  );
}
