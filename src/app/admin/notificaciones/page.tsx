import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { COLUMNAS_NOTIFICACION, type Notificacion } from "@/lib/notificaciones";
import { formatFechaHora } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { BotonFormulario } from "@/components/ui/boton-formulario";
import { abrirNotificacion } from "./actions";
import { MarcarLeidaBtn, MarcarTodasLeidasBtn } from "./acciones-notificaciones";

export const metadata: Metadata = {
  title: "Notificaciones | Panel municipal | Portal de Empleo Funes",
};

const RUTA = "/admin/notificaciones";

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { count: noLeidas } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", user.id)
    .is("leida_en", null);

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Panel
        </Link>
        <span>/</span>
        <span className="text-foreground">Notificaciones</span>
      </div>

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
        <ListadoNotificaciones usuarioId={user.id} pagina={pagina} searchParams={sp} />
      </Suspense>
    </section>
  );
}

async function ListadoNotificaciones({
  usuarioId,
  pagina,
  searchParams,
}: {
  usuarioId: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();
  const resultado = await consultarPagina<Notificacion>(pagina, (desde, hasta) =>
    supabase
      .from("notificaciones")
      .select(COLUMNAS_NOTIFICACION, { count: "exact" })
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta)
      .overrideTypes<Notificacion[], { merge: false }>()
  );

  if (!resultado.ok) {
    const ref = logError("admin_notificaciones_listado", resultado.error);
    return <ErrorListado className="mt-6" refError={ref} />;
  }

  if (resultado.filas.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={Bell}
        titulo="No tenés notificaciones"
        descripcion="Cuando una empresa contrate a un postulante derivado, te avisamos acá."
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
              <div className="flex min-w-0 items-start gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 h-2 w-2 shrink-0 rounded-full",
                    noLeida ? "bg-amber-500" : "bg-transparent",
                  )}
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {n.titulo}
                    {noLeida && <span className="sr-only"> (sin leer)</span>}
                  </p>
                  <p className="break-words text-sm text-muted-foreground-strong">{n.mensaje}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFechaHora(n.created_at)}
                  </p>
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
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </>
  );
}
