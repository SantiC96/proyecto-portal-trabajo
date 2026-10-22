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
import { BotonVolver } from "@/components/ui/boton-volver";
import { PestanasEstado } from "@/components/ui/pestanas-estado";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { RevisarComprobante } from "@/components/admin/revisar-comprobante";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Comprobantes | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/comprobantes";

const PESTANAS = ["por-revisar", "revisados"] as const;
type PestanaComprobantes = (typeof PESTANAS)[number];

const COLUMNAS =
  "id, ruta, creado_en, verificacion_estado, verificacion_motivo, verificado_en, usuarios!usuario_id(nombre, apellido, postulantes(id, dni, localidad, domicilio)), revisor:usuarios!verificado_por(nombre, apellido)" as const;

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
    <section>
      <BotonVolver href="/admin">Volver al panel</BotonVolver>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Comprobantes de domicilio
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Revisá los comprobantes que suben los postulantes de Funes.
      </p>

      <PestanasEstado
        className="mt-6"
        etiqueta="Estado de los comprobantes"
        pestanas={[
          {
            href: RUTA,
            label: pendientes > 0 ? `Por revisar (${pendientes})` : "Por revisar",
            activa: pestana === "por-revisar",
          },
          {
            href: hrefConParams(RUTA, {}, { estado: "revisados" }),
            label: "Revisados",
            activa: pestana === "revisados",
          },
        ]}
      />

      <div className="mt-4 space-y-4">
        <Suspense
          key={JSON.stringify({ pestana, pagina })}
          fallback={<EsqueletoLista filas={5} />}
        >
          <ListadoComprobantes pestana={pestana} pagina={pagina} searchParams={sp} />
        </Suspense>
      </div>
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
    <>
      <p className="text-sm text-muted-foreground">
        {resultado.total === 1 ? "1 comprobante" : `${resultado.total} comprobantes`}
      </p>

      {/* En celular cada comprobante es una tarjeta; desde lg, una fila. */}
      <ul className="space-y-3">
        {filas.map((f) => {
          const usuario = f.usuarios;
          const postulante = usuario?.postulantes ?? null;
          const nombre = usuario ? `${usuario.nombre} ${usuario.apellido}` : "—";
          const url = urls.get(f.ruta) ?? null;
          const rechazado = f.verificacion_estado === "rechazado";

          return (
            <li
              key={f.id}
              className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4 lg:flex-row lg:items-center lg:gap-6"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {postulante ? (
                    <Link
                      href={`/admin/postulantes/${postulante.id}`}
                      className="break-words font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {nombre}
                    </Link>
                  ) : (
                    <span className="break-words font-medium text-foreground">{nombre}</span>
                  )}
                  {!porRevisar && <EstadoRevision rechazado={rechazado} />}
                </div>

                <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  <Dato etiqueta="DNI">
                    <span className="font-mono">{postulante?.dni ?? "—"}</span>
                  </Dato>
                  <Dato etiqueta="Localidad">{postulante?.localidad ?? "Sin informar"}</Dato>
                  <Dato etiqueta="Domicilio">{postulante?.domicilio || "—"}</Dato>
                  <Dato etiqueta="Subido el">{formatFecha(f.creado_en)}</Dato>
                  {!porRevisar && (
                    <Dato etiqueta="Revisado">
                      {formatFechaHora(f.verificado_en)}
                      {f.revisor ? ` por ${f.revisor.nombre} ${f.revisor.apellido}` : ""}
                    </Dato>
                  )}
                </dl>

                {rechazado && f.verificacion_motivo && (
                  <p className="whitespace-pre-line break-words text-sm text-danger">
                    Motivo: {f.verificacion_motivo}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 lg:flex-none lg:justify-end">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-4 text-sm font-medium"
                  >
                    Ver comprobante
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">(se abre en otra pestaña)</span>
                  </a>
                ) : (
                  <span className="self-center text-xs text-muted-foreground">
                    El archivo no está disponible.
                  </span>
                )}
                {porRevisar && <RevisarComprobante archivoId={f.id} />}
              </div>
            </li>
          );
        })}
      </ul>

      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="w-20 flex-none text-muted-foreground">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

function EstadoRevision({ rechazado }: { rechazado: boolean }) {
  return (
    <Badge tono={rechazado ? "danger" : "success"} estado>
      {rechazado ? "Rechazado" : "Aprobado"}
    </Badge>
  );
}
