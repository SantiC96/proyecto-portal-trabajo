import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, FileCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirRolPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { consultarPagina, hrefConParams, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import {
  SEGUNDOS_URL_COMPROBANTE_OFICINA,
  urlsFirmadasDeComprobantes,
} from "@/lib/comprobantes";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { PestanasEstado } from "@/components/ui/pestanas-estado";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { RevisarComprobante } from "@/components/admin/revisar-comprobante";
import { Badge } from "@/components/ui/badge";
import { DatosClave } from "@/components/ui/datos-clave";
import { CeldaTabla, FilaTabla, Tabla } from "@/components/ui/tabla";

export const metadata: Metadata = {
  title: "Comprobantes | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/comprobantes";

const PESTANAS = ["por-revisar", "revisados"] as const;
type PestanaComprobantes = (typeof PESTANAS)[number];

const COLUMNAS =
  "id, ruta, creado_en, verificacion_estado, verificacion_motivo, verificado_en, usuarios!usuario_id(nombre, apellido, postulantes(id, dni, localidad, domicilio)), revisor:usuarios!verificado_por(nombre, apellido)" as const;

// Nombre | DNI | Localidad | Domicilio declarado | Cargado el | Comprobante | acciones o resultado.
const COLUMNAS_TABLA =
  "minmax(0,1.3fr) 6.5rem minmax(0,1fr) minmax(0,1.5fr) 6.5rem minmax(0,1.2fr) minmax(11rem,auto)";

export default async function ComprobantesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string }>;
}) {
  await requerirRolPagina("municipalidad");
  const sp = await searchParams;
  const pestana: PestanaComprobantes = PESTANAS.find((p) => p === sp.estado) ?? "por-revisar";
  const pagina = leerPagina(sp.pagina);

  const supabase = await createSupabaseServerClient();
  // Mismo conteo que la tarjeta del panel: al revisar uno, router.refresh()
  // vuelve a pedirlo y el número de la pestaña baja.
  const { count, error } = await supabase
    .from("archivos_usuario")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "comprobante_domicilio")
    .is("eliminado_en", null)
    .eq("verificacion_estado", "pendiente");
  if (error) logError("admin_comprobantes_contador", error);
  const pendientes = count ?? 0;

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Comprobantes de domicilio"
        bajada="Al aprobarlo, el postulante pasa a «De Funes verificado»."
      />

      <PestanasEstado
        etiqueta="Estado de los comprobantes"
        pestanas={[
          {
            href: RUTA,
            label: "Por revisar",
            activa: pestana === "por-revisar",
            cantidad: pendientes,
          },
          {
            href: hrefConParams(RUTA, {}, { estado: "revisados" }),
            label: "Revisados",
            activa: pestana === "revisados",
          },
        ]}
      />

      <Suspense key={JSON.stringify({ pestana, pagina })} fallback={<EsqueletoLista filas={5} />}>
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

  // Solo el comprobante vigente de cada postulante (el reemplazado queda con
  // eliminado_en). Por revisar: el más viejo primero. Revisados: el más
  // reciente primero.
  const resultado = await consultarPagina(pagina, (desde, hasta) => {
    const query = supabase
      .from("archivos_usuario")
      .select(COLUMNAS, { count: "exact" })
      .eq("tipo", "comprobante_domicilio")
      .is("eliminado_en", null);

    return porRevisar
      ? query
          .eq("verificacion_estado", "pendiente")
          .order("creado_en", { ascending: true })
          .order("id", { ascending: true })
          .range(desde, hasta)
      : query
          .in("verificacion_estado", ["aprobado", "rechazado"])
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
      <p className="text-sm text-muted-foreground-strong">
        {resultado.total === 1 ? "1 comprobante" : `${resultado.total} comprobantes`}
      </p>

      {/* Desde 896 px de ancho, una tabla; más angosto, una tarjeta por comprobante. */}
      <Tabla
        columnas={COLUMNAS_TABLA}
        etiqueta={porRevisar ? "Comprobantes por revisar" : "Comprobantes revisados"}
        encabezados={[
          "Nombre",
          "DNI",
          "Localidad",
          "Domicilio declarado",
          "Cargado el",
          "Comprobante",
          porRevisar ? "" : "Resultado",
        ]}
      >
        {filas.map((f) => {
          const usuario = f.usuarios;
          const postulante = usuario?.postulantes ?? null;
          const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : "—";
          const url = urls.get(f.ruta) ?? null;
          const rechazado = f.verificacion_estado === "rechazado";
          const localidad = postulante?.localidad ?? "Sin informar";
          const domicilio = postulante?.domicilio || "—";

          return (
            <FilaTabla key={f.id}>
              {/* Nombre; en la tarjeta, con el DNI y la fecha debajo. */}
              <div className="min-w-0">
                {postulante ? (
                  <Link
                    href={`/admin/postulantes/${postulante.id}`}
                    className="rounded-[var(--radius-sm)] text-[15px] font-bold break-words text-heading no-underline outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
                  >
                    {nombre}
                  </Link>
                ) : (
                  <span className="text-[15px] font-bold break-words text-heading">{nombre}</span>
                )}
                <p className="mt-0.5 text-sm text-muted-foreground @4xl:hidden">
                  <span className="tabular-nums">DNI {postulante?.dni ?? "—"}</span> · Cargado el{" "}
                  {formatFecha(f.creado_en)}
                </p>
              </div>

              <CeldaTabla etiqueta="DNI" className="hidden tabular-nums @4xl:block">
                {postulante?.dni ?? "—"}
              </CeldaTabla>
              <CeldaTabla etiqueta="Localidad" className="hidden @4xl:block">
                {localidad}
              </CeldaTabla>
              <CeldaTabla etiqueta="Domicilio declarado" className="hidden @4xl:block">
                {domicilio}
              </CeldaTabla>
              <DatosClave
                className="@4xl:hidden"
                datos={[
                  { etiqueta: "Localidad", valor: localidad },
                  { etiqueta: "Domicilio declarado", valor: domicilio },
                ]}
              />
              <CeldaTabla etiqueta="Cargado el" className="hidden tabular-nums @4xl:block">
                {formatFecha(f.creado_en)}
              </CeldaTabla>

              {/* Comprobante: link en la tabla, botón a todo el ancho en la tarjeta. */}
              <div className="min-w-0">
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
                      <span className="sr-only">(se abre en otra pestaña)</span>
                    </a>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden min-h-10 items-center gap-1.5 rounded-[var(--radius-sm)] text-[15px] font-bold text-primary underline-offset-2 outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)] @4xl:inline-flex"
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
                <RevisarComprobante
                  archivoId={f.id}
                  rechazarConBorde
                  className="grid grid-cols-2 gap-2 @4xl:flex @4xl:flex-nowrap @4xl:justify-end"
                  claseBoton="w-full px-3! @4xl:w-auto @4xl:min-h-10! @4xl:text-sm!"
                />
              ) : (
                <CeldaTabla etiqueta="Resultado" className="flex flex-col items-start gap-1">
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
                </CeldaTabla>
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
