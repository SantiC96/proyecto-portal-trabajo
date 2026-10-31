import Link from "next/link";
import type { PostgrestError } from "@supabase/supabase-js";
import { ChevronRight, CircleX, Clock, Mail, MailCheck, type LucideIcon } from "lucide-react";
import { ErrorListado } from "@/components/ui/estado-listado";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { IconoCuadro } from "@/components/ui/icono-cuadro";
import { EtiquetaRubro } from "@/components/ui/etiqueta-rubro";
import { InicialesEmpresa } from "@/components/ofertas/iniciales-empresa";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logError } from "@/lib/logger";
import { formatFecha } from "@/lib/fechas";
import { consultaCvsDisponibles, conUrlsFirmadas, type CvVista } from "@/lib/cvs";
import { nombresCategorias } from "@/lib/ofertas";
import { esEstadoInvitacion, type EstadoInvitacion } from "@/lib/invitaciones";
import type { FilaMiInvitacion } from "@/types/db";
import { InvitacionAcciones } from "./invitacion-acciones";

/** Cuántas respondidas o vencidas se muestran en el historial. */
const HISTORIAL_MAXIMO = 20;

export type ConsultaInvitaciones = Promise<{
  data: FilaMiInvitacion[] | null;
  error: PostgrestError | null;
}>;

// En esta pantalla una respuesta del postulante no es un error: "No me
// interesa" va en gris, igual que una vencida.
// El ícono va en un cuadrado verde si aceptó y gris si no; el punto del
// resumen, del mismo color.
type Respondida = Exclude<EstadoInvitacion, "pendiente">;

const RESPONDIDA: Record<
  Respondida,
  { texto: string; tono: TonoBadge; icono: LucideIcon; fondo: string; resumen: (n: number) => string }
> = {
  aceptada: {
    texto: "Aceptada",
    tono: "success",
    icono: MailCheck,
    fondo: "bg-primary",
    resumen: (n) => `${n} ${n === 1 ? "aceptada" : "aceptadas"}`,
  },
  rechazada: {
    texto: "No me interesa",
    tono: "neutral",
    icono: CircleX,
    fondo: "bg-neutral",
    resumen: (n) => `${n} no me interesa`,
  },
  vencida: {
    texto: "Vencida",
    tono: "neutral",
    icono: Clock,
    fondo: "bg-neutral",
    resumen: (n) => `${n} ${n === 1 ? "vencida" : "vencidas"}`,
  },
};

const ORDEN_RESUMEN: Respondida[] = ["aceptada", "rechazada", "vencida"];

function estadoRespondida(inv: FilaMiInvitacion): Respondida {
  return esEstadoInvitacion(inv.estado) && inv.estado !== "pendiente" ? inv.estado : "vencida";
}

/** Bajada del encabezado: cuántas invitaciones esperan respuesta. */
export async function BajadaInvitaciones({ consulta }: { consulta: ConsultaInvitaciones }) {
  const { data } = await consulta;
  const pendientes = (data ?? []).filter((i) => i.estado === "pendiente").length;
  if (pendientes === 0) return <>Ofertas que la Oficina de Empleo te propone</>;
  return (
    <>
      Tenés {pendientes} {pendientes === 1 ? "invitación pendiente" : "invitaciones pendientes"} de
      respuesta
    </>
  );
}

/**
 * Invitaciones de la Oficina de Empleo a postularse (migration_056): las
 * pendientes arriba con "Me interesa" / "No me interesa" y las respondidas o
 * vencidas debajo.
 */
export async function SeccionInvitaciones({
  consulta,
  usuarioId,
}: {
  consulta: ConsultaInvitaciones;
  usuarioId: string;
}) {
  const { data, error } = await consulta;

  if (error) {
    const ref = logError("mis_invitaciones", error);
    return (
      <ErrorListado
        mensaje="No pudimos cargar tus invitaciones. Intentá de nuevo en unos minutos."
        refError={ref}
      />
    );
  }

  const invitaciones = data ?? [];
  if (invitaciones.length === 0) {
    return (
      <SinPendientes
        titulo="No tenés invitaciones por ahora."
        accion={
          <Link href="/ofertas" className="btn-secundario mt-1">
            Ver ofertas
          </Link>
        }
      />
    );
  }

  const pendientes = invitaciones.filter((i) => i.estado === "pendiente");
  const historial = invitaciones.filter((i) => i.estado !== "pendiente");

  const supabase = await createSupabaseServerClient();
  let cvs: CvVista[] = [];
  const detalles = new Map<string, DetalleOferta>();
  if (pendientes.length > 0) {
    const [resultadoCvs, resultadoOfertas] = await Promise.all([
      consultaCvsDisponibles(supabase, usuarioId),
      // Rubros, modalidad, jornada y vencimiento de las ofertas propuestas. Sin
      // estos datos la tarjeta se muestra igual, sin las etiquetas.
      supabase
        .from("ofertas")
        .select("id, modalidad, jornada, vence_en, oferta_categorias(categorias(nombre))")
        .in(
          "id",
          pendientes.map((i) => i.oferta_id),
        ),
    ]);
    if (resultadoCvs.error) logError("mis_invitaciones:cvs", resultadoCvs.error);
    if (resultadoOfertas.error) logError("mis_invitaciones:ofertas", resultadoOfertas.error);
    cvs = await conUrlsFirmadas(supabase, resultadoCvs.data ?? [], 600);
    for (const o of resultadoOfertas.data ?? []) {
      detalles.set(o.id, {
        rubros: nombresCategorias(o.oferta_categorias),
        modalidad: o.modalidad,
        jornada: o.jornada,
        venceEn: o.vence_en,
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {pendientes.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pendientes.map((inv) => (
            <li key={inv.id}>
              <TarjetaInvitacion
                invitacion={inv}
                detalle={detalles.get(inv.oferta_id) ?? null}
                cvs={cvs}
              />
            </li>
          ))}
        </ul>
      ) : (
        <SinPendientes titulo="No tenés invitaciones pendientes" />
      )}

      {historial.length > 0 && (
        <section aria-labelledby="invitaciones-respondidas" className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2
              id="invitaciones-respondidas"
              className="text-lg font-extrabold text-heading sm:text-xl"
            >
              Respondidas
            </h2>
            <ResumenRespondidas historial={historial} />
          </div>
          <ul className="flex flex-col gap-2">
            {historial.slice(0, HISTORIAL_MAXIMO).map((inv) => (
              <li key={inv.id}>
                <FilaRespondida invitacion={inv} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type DetalleOferta = {
  rubros: string[];
  modalidad: string;
  jornada: string;
  venceEn: string | null;
};

function TarjetaInvitacion({
  invitacion: inv,
  detalle,
  cvs,
}: {
  invitacion: FilaMiInvitacion;
  detalle: DetalleOferta | null;
  cvs: CvVista[];
}) {
  return (
    <article className="tarjeta tarjeta-panel flex h-full flex-col gap-4">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
        <Mail className="size-4 shrink-0" aria-hidden="true" />
        La Oficina de Empleo te propone esta oferta
      </p>

      <div className="flex min-w-0 items-start gap-3">
        <InicialesEmpresa empresa={inv.empresa_nombre} tamano={44} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug font-bold text-heading">
            <Link
              href={`/ofertas/${inv.oferta_id}`}
              className="rounded-[var(--radius-sm)] outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)]"
            >
              {inv.oferta_titulo}
            </Link>
          </h3>
          {inv.empresa_nombre && (
            <p className="truncate text-[15px] font-semibold text-texto-bajada">
              {inv.empresa_nombre}
            </p>
          )}
        </div>
      </div>

      {detalle && (
        <div className="flex flex-wrap gap-2">
          {detalle.rubros.map((r) => (
            <EtiquetaRubro key={r} verde>
              {r}
            </EtiquetaRubro>
          ))}
          <EtiquetaRubro>{detalle.modalidad}</EtiquetaRubro>
          <EtiquetaRubro>{detalle.jornada}</EtiquetaRubro>
        </div>
      )}

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Recibida el {formatFecha(inv.creada_en)}</span>
        {detalle?.venceEn && (
          <span className="font-bold text-texto-vence">Vence el {formatFecha(detalle.venceEn)}</span>
        )}
      </p>

      <div className="mt-auto">
        <InvitacionAcciones
          invitacionId={inv.id}
          ofertaTitulo={inv.oferta_titulo}
          empresaNombre={inv.empresa_nombre}
          cvs={cvs}
        />
      </div>
    </article>
  );
}

/**
 * Sin invitaciones pendientes: el sobre en un cuadrado verde con halo, sobre
 * un degradé verde muy suave. Los textos son los de antes.
 */
export function SinPendientes({ titulo, accion }: { titulo: string; accion?: React.ReactNode }) {
  return (
    <div className="tarjeta tarjeta-panel flex flex-col items-center gap-4 bg-linear-to-b from-surface-tinted to-surface py-8 text-center sm:py-10">
      <IconoCuadro
        icono={Mail}
        tamano={56}
        className="shadow-[0_0_0_8px_rgb(0_104_51/0.10)]"
      />
      <div>
        <p className="text-lg font-extrabold text-heading">{titulo}</p>
        <p className="mt-1 text-base text-muted-foreground">
          Cuando la Oficina de Empleo te proponga una oferta, la vas a ver acá.
        </p>
      </div>
      {accion}
    </div>
  );
}

/** "4 aceptadas · 1 no me interesa · 1 vencida", sobre todo el historial. */
function ResumenRespondidas({ historial }: { historial: FilaMiInvitacion[] }) {
  const cantidades = new Map<Respondida, number>();
  for (const inv of historial) {
    const estado = estadoRespondida(inv);
    cantidades.set(estado, (cantidades.get(estado) ?? 0) + 1);
  }
  return (
    <ul aria-label="Resumen de las respondidas" className="flex flex-wrap gap-2">
      {ORDEN_RESUMEN.filter((e) => cantidades.has(e)).map((estado) => (
        <li
          key={estado}
          className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-semibold whitespace-nowrap text-control-foreground"
        >
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${RESPONDIDA[estado].fondo}`} />
          {RESPONDIDA[estado].resumen(cantidades.get(estado)!)}
        </li>
      ))}
    </ul>
  );
}

function FilaRespondida({ invitacion: inv }: { invitacion: FilaMiInvitacion }) {
  const estado = estadoRespondida(inv);
  const { texto, tono, icono, fondo } = RESPONDIDA[estado];
  const cuando =
    estado === "vencida"
      ? `venció el ${formatFecha(inv.vencida_en)}`
      : `respondida el ${formatFecha(inv.respondida_en)}`;

  return (
    <div className="tarjeta flex items-start gap-3.5 rounded-[var(--radius-lg)] px-4 py-3.5 sm:items-center">
      <IconoCuadro icono={icono} className={fondo} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-bold break-words text-heading">{inv.oferta_titulo}</p>
          <p className="text-sm text-muted-foreground">
            {inv.empresa_nombre ? `${inv.empresa_nombre} · ` : ""}
            {cuando}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
          <Badge tono={tono}>{texto}</Badge>
          {inv.oferta_disponible && (
            <Link
              href={`/ofertas/${inv.oferta_id}`}
              className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] text-[15px] font-bold whitespace-nowrap text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
            >
              Ver oferta
              <span className="sr-only">: {inv.oferta_titulo}</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
