import { Suspense } from "react";
import { Bell } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { COLUMNAS_NOTIFICACION } from "@/lib/notificaciones";
import { formatFechaHora, formatFechaRelativa } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { BotonFormulario } from "@/components/ui/boton-formulario";
import { MarcarLeidasAlEntrar } from "./acciones-notificaciones";
import { FormAbrirNotificacion } from "./form-abrir-notificacion";
import { IconoNotificacion } from "./icono-notificacion";
import { ListaNotificacionesAgrupada, type RolListaNotificaciones } from "./lista-agrupada";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";

/**
 * Listado paginado de las notificaciones del usuario. Lo usan las páginas de
 * los tres roles; cada una verifica el rol antes de renderizarlo. Al entrar,
 * las nuevas se marcan como leídas (siguen resaltadas en esta visita).
 */
export async function PaginaNotificaciones({
  usuarioId,
  ruta,
  volverA,
  textoVacio,
  searchParams,
  banda = false,
  rol = "postulante",
}: {
  usuarioId: string;
  /** Ruta de esta página (para la paginación). */
  ruta: string;
  /** Destino de respaldo de "Volver" (el panel del rol). */
  volverA: string;
  textoVacio: string;
  searchParams: ParamsUrl;
  /** Encabezado con banda verde y lista agrupada por fecha (los tres roles). */
  banda?: boolean;
  /** Con `banda`: los íconos y colores de cada tipo. */
  rol?: RolListaNotificaciones;
}) {
  const pagina = leerPagina(searchParams.pagina);
  const supabase = await createSupabaseServerClient();

  // La más nueva sin leer: hasta ahí se marcan como leídas al entrar.
  const { data: nuevas, count: noLeidas } = await supabase
    .from("notificaciones")
    .select("created_at", { count: "exact" })
    .eq("usuario_id", usuarioId)
    .is("leida_en", null)
    .order("created_at", { ascending: false })
    .limit(1);
  const masNueva = nuevas?.[0]?.created_at ?? null;

  const bajada =
    (noLeidas ?? 0) > 0 ? `${noLeidas} ${noLeidas === 1 ? "nueva" : "nuevas"}` : "Estás al día.";

  return (
    <section>
      <BotonVolver href={volverA} destacado={banda} />

      {banda ? (
        <EncabezadoPagina banda className="mt-4" titulo="Notificaciones" bajada={bajada} />
      ) : (
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Notificaciones
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{bajada}</p>
          </div>
        </div>
      )}

      <Suspense key={pagina} fallback={<EsqueletoLista filas={5} className="mt-6" />}>
        <ListadoNotificaciones
          usuarioId={usuarioId}
          pagina={pagina}
          ruta={ruta}
          textoVacio={textoVacio}
          searchParams={searchParams}
          masNueva={masNueva}
          agrupada={banda}
          rol={rol}
        />
      </Suspense>
    </section>
  );
}

async function ListadoNotificaciones({
  usuarioId,
  pagina,
  ruta,
  textoVacio,
  searchParams,
  masNueva,
  agrupada,
  rol,
}: {
  usuarioId: string;
  pagina: number;
  ruta: string;
  textoVacio: string;
  searchParams: ParamsUrl;
  /** La más nueva sin leer al cargar la página; null si no había. */
  masNueva: string | null;
  /** Agrupada por fecha, en tarjetas (postulante y empresa). */
  agrupada: boolean;
  rol: RolListaNotificaciones;
}) {
  const supabase = await createSupabaseServerClient();
  const resultado = await consultarPagina(pagina, (desde, hasta) =>
    supabase
      .from("notificaciones")
      // La clave distingue los avisos de la oficina que comparten tipo (reenvío, edición).
      .select(`${COLUMNAS_NOTIFICACION}, clave`, { count: "exact" })
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta)
  );

  if (!resultado.ok) {
    const ref = logError("notificaciones_listado", resultado.error);
    return <ErrorListado className="mt-6" refError={ref} />;
  }

  if (resultado.filas.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={Bell}
        titulo="No tenés notificaciones"
        descripcion={textoVacio}
      />
    );
  }

  return (
    <>
      {/* Se marca después de leer el listado, así las nuevas se ven resaltadas. */}
      {masNueva && <MarcarLeidasAlEntrar hasta={masNueva} />}
      {agrupada ? (
        <div className="mt-6">
          <ListaNotificacionesAgrupada filas={resultado.filas} ahora={new Date()} rol={rol} />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {resultado.filas.map((n) => {
            const nueva = !n.leida_en;
            return (
              <li
                key={n.id}
                className={cn(
                  "flex flex-col gap-3 rounded-[var(--radius-lg)] border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between",
                  nueva ? "border-primary/30 bg-secondary/40" : "border-border",
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <IconoNotificacion tipo={n.tipo} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      {nueva && (
                        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                      )}
                      {n.titulo}
                      {nueva && <span className="sr-only"> (nueva)</span>}
                    </p>
                    <p className="break-words text-sm text-muted-foreground-strong">{n.mensaje}</p>
                    <time
                      dateTime={n.created_at}
                      title={formatFechaHora(n.created_at)}
                      className="mt-0.5 block text-xs text-muted-foreground"
                    >
                      {formatFechaRelativa(n.created_at)}
                    </time>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-none sm:justify-end">
                  {n.link && (
                    <FormAbrirNotificacion id={n.id}>
                      <BotonFormulario
                        textoPendiente="Abriendo…"
                        className="btn-secundario inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-4 text-sm font-medium"
                      >
                        Ver detalle
                      </BotonFormulario>
                    </FormAbrirNotificacion>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Paginacion
        className="mt-6"
        ruta={ruta}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </>
  );
}
