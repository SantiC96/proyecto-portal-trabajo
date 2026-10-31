import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Send, UserCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { AvisoUrl } from "@/components/ui/aviso-url";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { Franja } from "@/components/ui/franja";
import { Badge } from "@/components/ui/badge";
import { CuadroEstado, CLASE_GRILLA_CUADROS, claseCeldaCuadro } from "@/components/ui/cuadro-estado";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { CandidatosSinResultado } from "./_components/candidatos-sin-resultado";
import { DIAS_AVISO_VENCIMIENTO } from "@/lib/ofertas-vencimiento";
import { ACENTO_ESTADO_OFERTA, aplicarFiltroOfertas } from "@/lib/empresa/filtro-ofertas";
import { CUADROS } from "./cuadros";
import { EsqueletoPorContactar } from "./esqueletos";
import { AccionesPanelEmpresa, MasHerramientas } from "./bloques-fijos";
import { generarAvisosVencimientoEmpresa } from "@/lib/notificaciones";
import { dentroDeDiasISO, formatFecha } from "@/lib/fechas";
import { inicialesDePersona } from "@/lib/iniciales";
import { fotosDeCandidatosEmpresa } from "@/lib/fotos-perfil";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_TONO } from "@/lib/derivacion-estados";
import type { FilaDerivacionDeOfertaEmpresa } from "@/types/db";
import { BotonVolver } from "@/components/ui/boton-volver";

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

  // Conteo de ofertas por estado, con los mismos criterios que el filtro de
  // Mis ofertas: una activa con vence_en pasado cuenta como "Vencida".
  const ahora = dentroDeDiasISO(0);
  const enDiasAviso = dentroDeDiasISO(DIAS_AVISO_VENCIMIENTO);
  const contar = () =>
    supabase
      .from("ofertas")
      .select("*", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .is("eliminada_en", null);
  const [conteos, porVencer] = await Promise.all([
    Promise.all(CUADROS.map((c) => aplicarFiltroOfertas(contar(), c.filtro, ahora))),
    contar().eq("estado", "activa").gt("vence_en", ahora).lte("vence_en", enDiasAviso),
  ]);
  const cantidadVencidas = conteos[CUADROS.findIndex((c) => c.filtro === "vencida")].count ?? 0;
  const cantidadPorVencer = porVencer.count ?? 0;

  return (
    <section className="flex flex-col gap-7">
      <Suspense>
        <AvisoUrl />
      </Suspense>

      <BotonVolver href="/" destacado />
      <EncabezadoPagina
        banda
        className="-mt-3"
        botonesBlancos
        titulo={`Hola, ${empresa.razon_social}`}
        bajada="Así están tus ofertas y tus candidatos."
        acciones={<AccionesPanelEmpresa />}
      />

      <Suspense fallback={null}>
        <CandidatosSinResultado />
      </Suspense>

      <section aria-labelledby="panel-ofertas" className="@container">
        <h2 id="panel-ofertas" className="sr-only">
          Tus ofertas
        </h2>
        <ul className={CLASE_GRILLA_CUADROS}>
          {CUADROS.map((cuadro, indice) => {
            const valor = conteos[indice].count ?? 0;
            const acento = ACENTO_ESTADO_OFERTA[cuadro.estado];
            const uno = valor === 1;
            return (
              <li key={cuadro.filtro} className={claseCeldaCuadro(indice)}>
                <CuadroEstado
                  href={`${MIS_OFERTAS}?estado=${cuadro.filtro}`}
                  etiqueta={cuadro.etiqueta}
                  etiquetaAccesible={`${valor} ${uno ? "oferta" : "ofertas"} ${cuadro.accesible[uno ? 0 : 1]}. Ver lista`}
                  valor={valor}
                  icono={acento.icono}
                  claseIcono={acento.fondoIcono}
                  claseFilete={acento.filete}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Candidatos por contactar y accesos: 1.7fr / 1fr, apiladas en celular.
          En dos columnas, las dos tarjetas de acceso ocupan el alto de la
          izquierda y el título queda afuera, arriba (por eso el margen extra). */}
      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-7 @3xl:mt-3 @3xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] @3xl:items-stretch">
          <section aria-labelledby="panel-por-contactar" className="tarjeta tarjeta-panel min-w-0">
            <TituloBloque
              id="panel-por-contactar"
              titulo="Candidatos por contactar"
              icono={Send}
              bajada="Derivados por la Oficina de Empleo y todavía pendientes."
            />
            <Suspense fallback={<EsqueletoPorContactar />}>
              <CandidatosPorContactar empresaId={empresa.id} />
            </Suspense>
          </section>

          <MasHerramientas />
        </div>
      </div>

      {/* Aviso de vencimientos: el panel ya lo tenía; queda debajo de los bloques nuevos. */}
      {(cantidadVencidas > 0 || cantidadPorVencer > 0) && (
        <Franja tono="aviso">
          {cantidadVencidas > 0 && (
            <>
              {cantidadVencidas === 1
                ? "Tenés 1 oferta vencida"
                : `Tenés ${cantidadVencidas} ofertas vencidas`}
              {" · "}
              <Link href={`${MIS_OFERTAS}?estado=vencida`}>
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
  const [candidatos, fotos] = await Promise.all([
    Promise.all(
      postulanteIds.map((pid) => supabase.rpc("candidato_para_empresa", { p_postulante_id: pid })),
    ),
    fotosDeCandidatosEmpresa(postulanteIds),
  ]);
  const nombres = new Map<string, { nombre: string; apellido: string }>();
  postulanteIds.forEach((pid, i) => {
    const fila = candidatos[i].data?.[0];
    if (fila) nombres.set(pid, { nombre: fila.nombre, apellido: fila.apellido });
  });

  return (
    <>
      <ul className="mt-4 divide-y divide-tabla-borde">
        {visibles.map((d) => {
          const persona = nombres.get(d.postulante_id);
          const nombre = persona ? `${persona.nombre} ${persona.apellido}` : "Candidato";
          const foto = fotos.get(d.postulante_id);
          return (
            <li
              key={d.derivacion_id}
              className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <AvatarAjustado
                  src={foto?.url}
                  ajuste={foto?.ajuste}
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
                  className="btn-secundario btn-chico w-full whitespace-nowrap sm:w-auto"
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
