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
import { abrirNotificacion } from "@/app/(dashboard)/notificaciones/actions";
import { MarcarLeidaBtn, MarcarTodasLeidasBtn } from "./acciones-notificaciones";
import { IconoNotificacion } from "./icono-notificacion";
import { BotonVolver } from "@/components/ui/boton-volver";

/**
 * Listado paginado de las notificaciones del usuario. Lo usan las páginas de
 * los tres roles; cada una verifica el rol antes de renderizarlo.
 */
export async function PaginaNotificaciones({
  usuarioId,
  ruta,
  panel,
  textoVacio,
  searchParams,
}: {
  usuarioId: string;
  /** Ruta de esta página (para la paginación). */
  ruta: string;
  /** Página a la que vuelve el botón "Volver" (el panel del rol). */
  panel: { href: string; label: string };
  textoVacio: string;
  searchParams: ParamsUrl;
}) {
  const pagina = leerPagina(searchParams.pagina);
  const supabase = await createSupabaseServerClient();

  const { count: noLeidas } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .is("leida_en", null);

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <BotonVolver href={panel.href}>{panel.label}</BotonVolver>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Notificaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {(noLeidas ?? 0) > 0
              ? `${noLeidas} sin leer`
              : "Estás al día."}
          </p>
        </div>
        {(noLeidas ?? 0) > 0 && <MarcarTodasLeidasBtn />}
      </div>

      <Suspense key={pagina} fallback={<EsqueletoLista filas={5} className="mt-6" />}>
        <ListadoNotificaciones
          usuarioId={usuarioId}
          pagina={pagina}
          ruta={ruta}
          textoVacio={textoVacio}
          searchParams={searchParams}
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
}: {
  usuarioId: string;
  pagina: number;
  ruta: string;
  textoVacio: string;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();
  const resultado = await consultarPagina(pagina, (desde, hasta) =>
    supabase
      .from("notificaciones")
      .select(COLUMNAS_NOTIFICACION, { count: "exact" })
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
      <ul className="mt-6 space-y-3">
        {resultado.filas.map((n) => {
          const noLeida = !n.leida_en;
          return (
            <li
              key={n.id}
              className={cn(
                "flex flex-col gap-3 rounded-[var(--radius-lg)] border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between",
                noLeida ? "border-primary/30 bg-secondary/40" : "border-border",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <IconoNotificacion tipo={n.tipo} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    {noLeida && (
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    )}
                    {n.titulo}
                    {noLeida && <span className="sr-only"> (sin leer)</span>}
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
                {noLeida && <MarcarLeidaBtn id={n.id} />}
                {n.link && (
                  <form action={abrirNotificacion.bind(null, n.id)}>
                    <BotonFormulario
                      textoPendiente="Abriendo…"
                      className="btn-secundario inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-4 text-sm font-medium"
                    >
                      Ver detalle
                    </BotonFormulario>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

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
