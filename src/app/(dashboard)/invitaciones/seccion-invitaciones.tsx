import Link from "next/link";
import type { PostgrestError } from "@supabase/supabase-js";
import { Mail } from "lucide-react";
import { ErrorListado } from "@/components/ui/estado-listado";
import { Badge, type TonoBadge } from "@/components/ui/badge";
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
const RESPONDIDA: Record<Exclude<EstadoInvitacion, "pendiente">, { texto: string; tono: TonoBadge }> = {
  aceptada: { texto: "Aceptada", tono: "success" },
  rechazada: { texto: "No me interesa", tono: "neutral" },
  vencida: { texto: "Vencida", tono: "neutral" },
};

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
      <div className="tarjeta flex flex-col items-center gap-3 px-4 py-10 text-center sm:px-8">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-tinted text-primary">
          <Mail className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-lg font-extrabold text-heading">No tenés invitaciones por ahora.</p>
          <p className="mt-1 text-base text-muted-foreground">
            Cuando la Oficina de Empleo te proponga una oferta, la vas a ver acá.
          </p>
        </div>
        <Link href="/ofertas" className="btn-secundario mt-1">
          Ver ofertas
        </Link>
      </div>
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
        <p className="text-base text-muted-foreground">No tenés invitaciones pendientes.</p>
      )}

      {historial.length > 0 && (
        <section aria-labelledby="invitaciones-respondidas" className="flex flex-col gap-3">
          <h2
            id="invitaciones-respondidas"
            className="text-lg font-extrabold text-heading sm:text-xl"
          >
            Respondidas
          </h2>
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
    <article className="tarjeta flex h-full flex-col gap-4 px-4 py-[18px] sm:p-6">
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

function FilaRespondida({ invitacion: inv }: { invitacion: FilaMiInvitacion }) {
  const estado: Exclude<EstadoInvitacion, "pendiente"> =
    esEstadoInvitacion(inv.estado) && inv.estado !== "pendiente" ? inv.estado : "vencida";
  const { texto, tono } = RESPONDIDA[estado];
  const cuando =
    estado === "vencida"
      ? `venció el ${formatFecha(inv.vencida_en)}`
      : `respondida el ${formatFecha(inv.respondida_en)}`;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-heading">
          {inv.oferta_disponible ? (
            <Link
              href={`/ofertas/${inv.oferta_id}`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] outline-none hover:text-primary hover:underline focus-visible:shadow-[var(--sombra-foco)] sm:min-h-0"
            >
              {inv.oferta_titulo}
            </Link>
          ) : (
            inv.oferta_titulo
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {inv.empresa_nombre ? `${inv.empresa_nombre} · ` : ""}
          {cuando}
        </p>
      </div>
      <Badge tono={tono}>{texto}</Badge>
    </div>
  );
}
