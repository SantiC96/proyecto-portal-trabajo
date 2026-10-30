import {
  Archive,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  CircleX,
  Send,
  type LucideIcon,
} from "lucide-react";
import { formatFechaHora, formatFechaRelativa } from "@/lib/fechas";
import { agruparNotificaciones } from "@/lib/grupos-notificaciones";
import type { Notificacion } from "@/lib/notificaciones";
import { cn } from "@/lib/utils";
import { BotonFormulario } from "@/components/ui/boton-formulario";
import { IconoCuadro } from "@/components/ui/icono-cuadro";
import { abrirNotificacion } from "@/app/(dashboard)/notificaciones/actions";
import { iconoTipoNotificacion } from "./icono-notificacion";

type Estilo = { icono: LucideIcon; fondo: string };

/** De qué rol es la lista: cambia el ícono y el color de cada tipo. */
export type RolListaNotificaciones = "postulante" | "empresa";

// Colores de la lista del postulante; los demás tipos van en neutro con su ícono.
const ESTILO_POSTULANTE: Record<string, Estilo> = {
  seleccionado: { icono: CircleCheck, fondo: "bg-success" },
  entrevista: { icono: CalendarClock, fondo: "bg-info" },
  pre_entrevista_coordinada: { icono: CalendarClock, fondo: "bg-info" },
  pre_entrevista_reprogramada: { icono: CalendarClock, fondo: "bg-info" },
  postulacion_derivada: { icono: Send, fondo: "bg-teal" },
  postulacion_cerrada: { icono: Archive, fondo: "bg-neutral" },
};

// Colores de la lista de la empresa. Sus tipos están en el CHECK
// notificaciones_tipo_check (migration_056); los que no tienen un ícono
// propio en el diseño toman el más cercano.
const ESTILO_EMPRESA: Record<string, Estilo> = {
  candidato_derivado: { icono: Send, fondo: "bg-teal" },
  oferta_aprobada: { icono: CircleCheck, fondo: "bg-success" },
  oferta_rechazada: { icono: CircleX, fondo: "bg-danger" },
  oferta_vencida: { icono: Archive, fondo: "bg-neutral" },
  solicitud_aprobada: { icono: CircleCheck, fondo: "bg-success" },
  solicitud_rechazada: { icono: CircleX, fondo: "bg-danger" },
  oferta_por_vencer: { icono: CalendarClock, fondo: "bg-info" },
  candidato_retirado: { icono: Archive, fondo: "bg-neutral" },
};

const ESTILOS: Record<RolListaNotificaciones, Record<string, Estilo>> = {
  postulante: ESTILO_POSTULANTE,
  empresa: ESTILO_EMPRESA,
};

function estiloDe(tipo: string, rol: RolListaNotificaciones): Estilo {
  return (
    ESTILOS[rol][tipo] ?? {
      icono: iconoTipoNotificacion(tipo),
      fondo: "bg-secondary text-neutral",
    }
  );
}

/**
 * Notificaciones de la página que se está viendo, agrupadas por fecha
 * ("Últimas 24 horas", "Esta semana", "Más antiguas"). Los grupos se calculan
 * en el servidor con la hora de Argentina; la paginación no cambia.
 */
export function ListaNotificacionesAgrupada({
  filas,
  ahora,
  rol = "postulante",
}: {
  filas: Notificacion[];
  ahora: Date;
  rol?: RolListaNotificaciones;
}) {
  const grupos = agruparNotificaciones(filas, ahora);

  return (
    <div className="flex flex-col gap-6">
      {grupos.map(({ grupo, titulo, filas: delGrupo }) => (
        <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="flex flex-col gap-3">
          <h2
            id={`grupo-${grupo}`}
            className="text-[13px] font-extrabold tracking-[0.06em] text-neutral uppercase"
          >
            {titulo}
          </h2>
          <ul className="flex flex-col gap-3">
            {delGrupo.map((n) => (
              <li key={n.id}>
                <TarjetaNotificacion notificacion={n} ahora={ahora} rol={rol} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TarjetaNotificacion({
  notificacion: n,
  ahora,
  rol,
}: {
  notificacion: Notificacion;
  ahora: Date;
  rol: RolListaNotificaciones;
}) {
  const nueva = !n.leida_en;
  const { icono, fondo } = estiloDe(n.tipo, rol);

  return (
    <article
      className={cn(
        "tarjeta tarjeta-panel flex gap-3 sm:items-start sm:gap-4",
        nueva && "border-primary/30 bg-secondary/40",
      )}
    >
      <IconoCuadro icono={icono} className={fondo} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base leading-snug font-extrabold text-heading">
            {nueva && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />}
            <span className="min-w-0 break-words">{n.titulo}</span>
            {nueva && <span className="sr-only"> (nueva)</span>}
          </h3>
          <p className="mt-1 text-[15px] leading-normal break-words text-muted-foreground-strong">
            {n.mensaje}
          </p>
          <time
            dateTime={n.created_at}
            title={formatFechaHora(n.created_at)}
            className="mt-1 block text-[13px] text-muted-foreground"
          >
            {formatFechaRelativa(n.created_at, ahora.getTime())}
          </time>
        </div>
        {n.link && (
          <form action={abrirNotificacion.bind(null, n.id)} className="shrink-0">
            <BotonFormulario
              textoPendiente="Abriendo…"
              className="-mx-1 inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] px-1 text-[15px] font-bold whitespace-nowrap text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)] disabled:opacity-60"
            >
              Ver detalle
              <span className="sr-only">: {n.titulo}</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </BotonFormulario>
          </form>
        )}
      </div>
    </article>
  );
}
