import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookmarkCheck, ChartColumn, List, Plus, UserCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { AvisoUrl } from "@/components/ui/aviso-url";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { Franja } from "@/components/ui/franja";
import { Badge, type TonoBadge } from "@/components/ui/badge";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { TarjetaAcceso } from "@/components/ui/tarjeta-acceso";
import { CandidatosSinResultado } from "./_components/candidatos-sin-resultado";
import { DIAS_AVISO_VENCIMIENTO } from "@/lib/ofertas-vencimiento";
import { generarAvisosVencimientoEmpresa } from "@/lib/notificaciones";
import { dentroDeDiasISO, formatFecha } from "@/lib/fechas";
import { inicialesDePersona } from "@/lib/iniciales";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_TONO } from "@/lib/derivacion-estados";
import type { FilaDerivacionDeOfertaEmpresa } from "@/types/db";

export const metadata: Metadata = {
  title: "Panel de empresa | Portal de Empleo Funes",
};

const MIS_OFERTAS = "/empresa/ofertas";

/** Candidatos por contactar que se muestran en el panel; el resto está en cada oferta. */
const MAXIMO_POR_CONTACTAR = 8;

export default async function EmpresaDashboardPage() {
  const empresa = await requerirEmpresaPagina();
  const supabase = await createSupabaseServerClient();

  // Sin cron: los avisos de vencimiento se generan al entrar al panel. Antes
  // del render, para que la campanita ya los cuente.
  await generarAvisosVencimientoEmpresa();

  // Conteo de ofertas por estado. Una oferta activa con vence_en vencido se
  // cuenta como "Vencida": sigue en estado 'activa' pero ya no se ve en el portal.
  const ahora = dentroDeDiasISO(0);
  const enDiasAviso = dentroDeDiasISO(DIAS_AVISO_VENCIMIENTO);
  const contar = () =>
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .is("eliminada_en", null);
  const [pendientes, publicadas, vencidas, rechazadas, cerradas, porVencer] = await Promise.all([
    contar().eq("estado", "pendiente_aprobacion"),
    contar().eq("estado", "activa").gt("vence_en", ahora),
    contar().eq("estado", "activa").lte("vence_en", ahora),
    contar().eq("estado", "rechazada"),
    contar().eq("estado", "cerrada"),
    contar().eq("estado", "activa").gt("vence_en", ahora).lte("vence_en", enDiasAviso),
  ]);

  // Mis ofertas no filtra por estado: todas las tarjetas llevan al listado.
  const resumen: { label: string; cantidad: number; tono: TonoBadge }[] = [
    { label: "Publicadas", cantidad: publicadas.count ?? 0, tono: "success" },
    { label: "En revisión", cantidad: pendientes.count ?? 0, tono: "warning" },
    { label: "Rechazadas", cantidad: rechazadas.count ?? 0, tono: "danger" },
    { label: "Cerradas", cantidad: cerradas.count ?? 0, tono: "neutral" },
    { label: "Vencidas", cantidad: vencidas.count ?? 0, tono: "danger" },
  ];
  const cantidadVencidas = vencidas.count ?? 0;
  const cantidadPorVencer = porVencer.count ?? 0;

  return (
    <section>
      <Suspense>
        <AvisoUrl />
      </Suspense>

      <EncabezadoPagina
        titulo={`Hola, ${empresa.razon_social}`}
        bajada="Así están tus ofertas y tus candidatos."
        acciones={
          <>
            <Link href={MIS_OFERTAS} className="btn-neutro grow sm:grow-0">
              <List aria-hidden="true" />
              Mis ofertas
            </Link>
            <Link href="/empresa/ofertas/nueva" className="btn-primario grow sm:grow-0">
              <Plus aria-hidden="true" />
              Publicar oferta
            </Link>
          </>
        }
      />

      {(cantidadVencidas > 0 || cantidadPorVencer > 0) && (
        <Franja tono="aviso" className="mt-6">
          {cantidadVencidas > 0 && (
            <>
              {cantidadVencidas === 1
                ? "Tenés 1 oferta vencida"
                : `Tenés ${cantidadVencidas} ofertas vencidas`}
              {" · "}
              <Link href={MIS_OFERTAS}>
                {cantidadVencidas === 1 ? "Renovala" : "Renovalas"} desde Mis ofertas
              </Link>
              {cantidadPorVencer > 0 && ". "}
            </>
          )}
          {cantidadPorVencer > 0 && (
            <>
              {cantidadPorVencer === 1
                ? "1 oferta vence"
                : `${cantidadPorVencer} ofertas vencen`}{" "}
              en los próximos {DIAS_AVISO_VENCIMIENTO} días
              {cantidadVencidas === 0 && (
                <>
                  {" · "}
                  <Link href={MIS_OFERTAS}>Ver mis ofertas</Link>
                </>
              )}
            </>
          )}
        </Franja>
      )}

      <section aria-labelledby="panel-ofertas" className="@container mt-8">
        <h2 id="panel-ofertas" className="sr-only">
          Tus ofertas
        </h2>
        <ul className="grid grid-cols-2 gap-4 @2xl:grid-cols-3 @5xl:grid-cols-5">
          {resumen.map((item) => (
            <li key={item.label}>
              <Link
                href={MIS_OFERTAS}
                className="tarjeta tarjeta-clickeable flex h-full flex-col gap-2.5 p-5 no-underline outline-none focus-visible:shadow-[var(--sombra-foco)]"
              >
                <Badge tono={item.tono} estado>
                  {item.label}
                </Badge>
                <span className="text-[36px] leading-none font-extrabold text-heading tabular-nums">
                  {item.cantidad}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="panel-por-contactar" className="mt-10">
        <h2 id="panel-por-contactar" className="text-[22px] leading-tight font-extrabold text-heading">
          Candidatos por contactar
        </h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Derivados por la Oficina de Empleo y todavía pendientes.
        </p>
        <Suspense fallback={<EsqueletoLista filas={3} className="mt-4" />}>
          <CandidatosPorContactar empresaId={empresa.id} />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <CandidatosSinResultado />
      </Suspense>

      {/* Accesos que el panel ya tenía y no están en el encabezado. */}
      <section aria-labelledby="panel-accesos" className="mt-10">
        <h2 id="panel-accesos" className="text-[22px] leading-tight font-extrabold text-heading">
          Más herramientas
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TarjetaAcceso
            href="/empresa/candidatos-guardados"
            icono={<BookmarkCheck className="size-[22px]" />}
            titulo="Candidatos guardados"
            descripcion="Perfiles para futuras búsquedas"
          />
          <TarjetaAcceso
            href="/empresa/indicadores"
            icono={<ChartColumn className="size-[22px]" />}
            titulo="Indicadores"
            descripcion="Derivaciones, entrevistas y vacantes cubiertas"
          />
        </div>
      </section>
    </section>
  );
}

/**
 * Derivaciones en "Por contactar" de todas las ofertas de la empresa, la más
 * reciente primero. Mismas funciones que Mis ofertas y el detalle de la
 * oferta: la empresa no puede leer postulaciones directamente.
 */
async function CandidatosPorContactar({ empresaId }: { empresaId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: conPendientes, error } = await supabase.rpc("ofertas_con_candidatos_pendientes");
  if (error) {
    const ref = logError("empresa_panel_por_contactar", error);
    return (
      <ErrorListado
        className="mt-4"
        mensaje="No pudimos cargar los candidatos por contactar."
        refError={ref}
      />
    );
  }

  const ofertaIds = [...new Set((conPendientes ?? []).map((r) => r.oferta_id))];
  const { data: ofertas, error: errorOfertas } =
    ofertaIds.length > 0
      ? await supabase
          .from("ofertas")
          .select("id, titulo")
          .in("id", ofertaIds)
          .eq("empresa_id", empresaId)
          .is("eliminada_en", null)
      : { data: [], error: null };
  if (errorOfertas) logError("empresa_panel_por_contactar_ofertas", errorOfertas);
  const titulos = new Map((ofertas ?? []).map((o) => [o.id, o.titulo]));

  const respuestas = await Promise.all(
    [...titulos.keys()].map(async (ofertaId) => {
      const r = await supabase
        .rpc("derivaciones_de_oferta_empresa", { p_oferta_id: ofertaId }, { count: "exact" })
        .eq("estado_empresa", "pendiente")
        .order("derivacion_created_at", { ascending: false })
        .limit(MAXIMO_POR_CONTACTAR);
      const data: FilaDerivacionDeOfertaEmpresa[] | null = r.data;
      if (r.error) logError("empresa_panel_por_contactar_derivaciones", r.error, { ofertaId });
      return { ofertaId, filas: data ?? [], total: r.count ?? data?.length ?? 0 };
    }),
  );

  const total = respuestas.reduce((suma, r) => suma + r.total, 0);
  const visibles = respuestas
    .flatMap((r) => r.filas.map((f) => ({ ...f, ofertaId: r.ofertaId })))
    .sort((a, b) => b.derivacion_created_at.localeCompare(a.derivacion_created_at))
    .slice(0, MAXIMO_POR_CONTACTAR);

  if (visibles.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-4"
        icono={UserCheck}
        titulo="No tenés candidatos por contactar"
        descripcion="Cuando la Oficina de Empleo te derive candidatos, van a aparecer acá."
      />
    );
  }

  const postulanteIds = [...new Set(visibles.map((d) => d.postulante_id))];
  const candidatos = await Promise.all(
    postulanteIds.map((pid) => supabase.rpc("candidato_para_empresa", { p_postulante_id: pid })),
  );
  const nombres = new Map<string, { nombre: string; apellido: string }>();
  postulanteIds.forEach((pid, i) => {
    const fila = candidatos[i].data?.[0];
    if (fila) nombres.set(pid, { nombre: fila.nombre, apellido: fila.apellido });
  });

  return (
    <>
      <ul className="tarjeta mt-4 divide-y divide-tabla-borde overflow-hidden">
        {visibles.map((d) => {
          const persona = nombres.get(d.postulante_id);
          const nombre = persona ? `${persona.nombre} ${persona.apellido}` : "Candidato";
          return (
            <li
              key={d.derivacion_id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <AvatarAjustado
                  alt=""
                  size="lista"
                  iniciales={persona ? inicialesDePersona(persona.nombre, persona.apellido) : undefined}
                />
                <div className="min-w-0">
                  <p className="text-base leading-snug font-bold break-words text-heading">{nombre}</p>
                  <p className="mt-0.5 text-sm break-words text-muted-foreground">
                    {titulos.get(d.ofertaId)} · derivado el {formatFecha(d.derivacion_created_at)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Badge tono={DERIVACION_ESTADO_TONO.pendiente} estado>
                  {DERIVACION_ESTADO_LABEL.pendiente}
                </Badge>
                <Link
                  href={`/empresa/ofertas/${d.ofertaId}/candidatos/${d.derivacion_id}`}
                  className="btn-neutro w-full whitespace-nowrap sm:w-auto"
                >
                  Ver candidato
                  <span className="sr-only">: {nombre}</span>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {total > visibles.length && (
        <p className="mt-3 text-sm text-muted-foreground-strong">
          {total - visibles.length === 1
            ? "Y 1 candidato más: lo encontrás en su oferta, en "
            : `Y ${total - visibles.length} candidatos más: los encontrás en cada oferta, en `}
          <Link href={MIS_OFERTAS} className="font-semibold text-primary underline underline-offset-2">
            Mis ofertas
          </Link>
          .
        </p>
      )}
    </>
  );
}
