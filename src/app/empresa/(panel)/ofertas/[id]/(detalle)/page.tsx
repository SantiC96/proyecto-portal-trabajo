import type { Metadata } from "next";
import { COLUMNAS } from "./columnas";
import { EsqueletoDerivados } from "./esqueleto";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  Clock,
  FileText,
  Gift,
  MapPin,
  Monitor,
  Pencil,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_TONO } from "@/lib/derivacion-estados";
import { Badge, BadgeBanda } from "@/components/ui/badge";
import { BarraProgreso } from "@/components/ui/barra-progreso";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { IconoCuadro } from "@/components/ui/icono-cuadro";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { Aviso } from "@/components/ui/aviso";
import { DescripcionPlegable } from "./descripcion-plegable";
import { ListaTexto, SeccionTexto } from "@/components/ofertas/seccion-texto";
import {
  CLASE_ACCION_FILA,
  CeldaPersona,
  CeldaTabla,
  FilaTabla,
  Tabla,
} from "@/components/ui/tabla";
import type { FilaCandidatoParaEmpresa, FilaDerivacionDeOfertaEmpresa } from "@/types/db";
import { estadoVencimiento, textoDiasRestantes } from "@/lib/ofertas-vencimiento";
import {
  ESTADO_OFERTA_EMPRESA_LABEL,
  type EstadoOfertaEmpresa,
} from "@/lib/oferta-estados";
import { inicialesDePersona } from "@/lib/iniciales";
import { RenovarOfertaBtn } from "../../_components/renovar-oferta-btn";
import { BajaOfertaBtn } from "../../_components/baja-oferta-btn";
import { bajasDeOfertas } from "@/lib/empresa/bajas-oferta";
import { BotonVolver } from "@/components/ui/boton-volver";
import { fotosDeCandidatosEmpresa } from "@/lib/fotos-perfil";

export const metadata: Metadata = {
  title: "Detalle de oferta | Portal de Empleo Funes",
};


export default async function OfertaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { id: ofertaId } = await params;
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);
  const empresa = await requerirEmpresaPagina("/empresa");
  const supabase = await createSupabaseServerClient();

  const { data: oferta } = await supabase
    .from("ofertas")
    .select(
      "id, titulo, estado, empresa_nombre, vence_en, duracion_dias, motivo_rechazo, created_at, publicado_en, modalidad, jornada, ubicacion, descripcion, requisitos, beneficios, oferta_categorias(categorias(nombre))",
    )
    .eq("id", ofertaId)
    .eq("empresa_id", empresa.id)
    .is("eliminada_en", null)
    .maybeSingle();

  if (!oferta) notFound();
  // Un borrador no tiene candidatos: se completa en el formulario.
  if (oferta.estado === "borrador") redirect(`/empresa/ofertas/${ofertaId}/editar`);

  const [vacantesResult, contratadosResult, bajas] = await Promise.all([
    supabase.from("oferta_vacantes").select("cantidad").eq("oferta_id", ofertaId).maybeSingle(),
    supabase.rpc("contratados_en_oferta", { p_oferta_id: ofertaId }),
    bajasDeOfertas([oferta]),
  ]);

  const vacantes = vacantesResult.data?.cantidad ?? null;
  if (contratadosResult.error) logError("empresa_oferta_contratados", contratadosResult.error);
  const contratados = contratadosResult.data ?? 0;

  const baja = bajas[oferta.id];
  const { vencida, porVencer, diasRestantes } = estadoVencimiento(oferta.estado, oferta.vence_en);
  const estadoVisible: EstadoOfertaEmpresa = vencida ? "vencida" : oferta.estado;
  const rubros = oferta.oferta_categorias
    .map((oc) => oc.categorias?.nombre)
    .filter((n): n is string => Boolean(n));

  const fechaAlta = oferta.publicado_en
    ? `Publicada el ${formatFecha(oferta.publicado_en)}`
    : `Creada el ${formatFecha(oferta.created_at)}`;
  const fechaVence =
    oferta.estado === "activa" && oferta.vence_en
      ? `${vencida ? "Venció" : "Vence"} el ${formatFecha(oferta.vence_en)}`
      : null;

  // "Corregir y reenviar" del aviso de rechazo ya lleva al formulario.
  const mostrarEditar = baja.acciones.mostrarEditar && oferta.estado !== "rechazada";
  const tieneAcciones =
    mostrarEditar || vencida || baja.acciones.mostrarEliminar || baja.acciones.mostrarRetirar;

  const datos: { etiqueta: string; icono: LucideIcon; valor: ReactNode }[] = [
    { etiqueta: "Rubro", icono: Tag, valor: rubros.length > 0 ? rubros.join(", ") : "—" },
    { etiqueta: "Modalidad", icono: Monitor, valor: oferta.modalidad },
    { etiqueta: "Jornada", icono: Clock, valor: oferta.jornada },
    { etiqueta: "Ubicación", icono: MapPin, valor: oferta.ubicacion || "—" },
    {
      etiqueta: "Vencimiento",
      icono: Calendar,
      valor: oferta.vence_en ? formatFecha(oferta.vence_en) : "—",
    },
  ];
  if (vacantes !== null) {
    datos.push({
      etiqueta: "Vacantes",
      icono: Users,
      valor: (
        <>
          {vacantes} {vacantes === 1 ? "vacante" : "vacantes"} · {contratados}{" "}
          {contratados === 1 ? "cubierta" : "cubiertas"}
          <span className="mt-2 flex items-center gap-2.5">
            <BarraProgreso
              fina
              porcentaje={vacantes > 0 ? (contratados / vacantes) * 100 : 0}
              etiqueta={`${contratados} de ${vacantes} vacantes cubiertas`}
            />
            <span className="shrink-0 text-sm font-bold whitespace-nowrap text-muted-foreground-strong tabular-nums">
              {contratados} de {vacantes}
            </span>
          </span>
        </>
      ),
    });
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <BotonVolver href="/empresa/ofertas" destacado />

      <EncabezadoPagina
        banda
        botonesBlancos
        className="-mt-2"
        titulo={oferta.titulo}
        junto={
          <BadgeBanda>{ESTADO_OFERTA_EMPRESA_LABEL[estadoVisible] ?? estadoVisible}</BadgeBanda>
        }
        bajada={
          <>
            {fechaAlta}
            {fechaVence && ` · ${fechaVence}`}
            {porVencer && diasRestantes !== null && (
              <span className="font-bold text-primary-foreground">
                {" · "}
                {textoDiasRestantes(diasRestantes)}
              </span>
            )}
          </>
        }
        acciones={
          tieneAcciones ? (
            <>
              {mostrarEditar && (
                <Link href={`/empresa/ofertas/${oferta.id}/editar`} className="btn-neutro">
                  <Pencil aria-hidden="true" />
                  Editar
                </Link>
              )}
              {vencida && (
                <RenovarOfertaBtn
                  ofertaId={oferta.id}
                  ofertaTitulo={oferta.titulo}
                  duracionDias={oferta.duracion_dias}
                  claseBoton=""
                />
              )}
              <BajaOfertaBtn
                oferta={oferta}
                baja={baja}
                volverA="/empresa/ofertas"
                estiloBoton="peligroBorde"
                claseBoton=""
              />
            </>
          ) : undefined
        }
      />

      {oferta.estado === "rechazada" && (
        <Aviso tono="danger" titulo="La Oficina de Empleo rechazó esta oferta">
          {oferta.motivo_rechazo && (
            <p className="whitespace-pre-line">
              <span className="font-semibold">Motivo del rechazo:</span>{" "}
              {oferta.motivo_rechazo}
            </p>
          )}
          {/* Botón blanco: sobre el rojo del aviso, el verde no contrasta. */}
          <Link
            href={`/empresa/ofertas/${oferta.id}/editar`}
            className="btn-neutro mt-3 no-underline!"
          >
            <Pencil className="h-4 w-4" />
            Corregir y reenviar
          </Link>
        </Aviso>
      )}

      {/* Datos (380 px) y textos, con la misma altura; apiladas en angosto. */}
      <div className="@container">
        <div className="grid grid-cols-1 items-stretch gap-6 @3xl:grid-cols-[380px_minmax(0,1fr)]">
          <section aria-labelledby="datos-oferta" className="tarjeta tarjeta-panel min-w-0">
            <TituloBloque id="datos-oferta" titulo="Datos de la oferta" icono={Briefcase} />
            <dl className="mt-5 flex flex-col gap-4">
              {datos.map((d) => (
                <div key={d.etiqueta} className="flex items-start gap-3">
                  <IconoCuadro icono={d.icono} className="bg-primary/10 text-primary" />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[13px] font-bold text-muted-foreground">{d.etiqueta}</dt>
                    <dd className="mt-0.5 text-base font-semibold break-words text-heading">
                      {d.valor}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          <section
            aria-label="Descripción, requisitos y beneficios"
            className="tarjeta tarjeta-panel flex min-w-0 flex-col divide-y divide-tabla-borde"
          >
            <SeccionTexto titulo="Descripción" icono={FileText}>
              <DescripcionPlegable texto={oferta.descripcion} />
            </SeccionTexto>
            {oferta.requisitos.length > 0 && (
              <SeccionTexto titulo="Requisitos" icono={ClipboardList}>
                <ListaTexto items={oferta.requisitos} />
              </SeccionTexto>
            )}
            {(oferta.beneficios ?? []).length > 0 && (
              <SeccionTexto titulo="Beneficios" icono={Gift}>
                <ListaTexto items={oferta.beneficios ?? []} />
              </SeccionTexto>
            )}
          </section>
        </div>
      </div>

      <section id="candidatos" aria-labelledby="candidatos-titulo" className="mt-4 scroll-mt-20">
        <TituloBloque
          id="candidatos-titulo"
          titulo="Candidatos derivados por la Oficina de Empleo"
          icono={Users}
          bajada="Los perfiles que la Oficina preseleccionó para esta oferta."
        />
        <Suspense key={pagina} fallback={<EsqueletoDerivados />}>
          <ListadoDerivados ofertaId={ofertaId} pagina={pagina} searchParams={sp} />
        </Suspense>
      </section>
    </section>
  );
}

async function ListadoDerivados({
  ofertaId,
  pagina,
  searchParams,
}: {
  ofertaId: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  // derivaciones_de_oferta_empresa devuelve un conjunto de filas: PostgREST
  // permite ordenarlo, contarlo y paginarlo como si fuera una tabla.
  const resultado = await consultarPagina(pagina, async (desde, hasta) => {
    const respuesta = await supabase
      .rpc("derivaciones_de_oferta_empresa", { p_oferta_id: ofertaId }, { count: "exact" })
      .order("derivacion_created_at", { ascending: false })
      .order("derivacion_id", { ascending: false })
      .range(desde, hasta);
    const data: FilaDerivacionDeOfertaEmpresa[] | null = respuesta.data;
    return { data, count: respuesta.count, error: respuesta.error };
  });

  if (!resultado.ok) {
    const ref = logError("empresa_oferta_derivados", resultado.error);
    return (
      <ErrorListado
        className="mt-4"
        mensaje="No pudimos cargar los candidatos derivados."
        refError={ref}
      />
    );
  }

  const derivaciones = resultado.filas;

  if (derivaciones.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-4"
        icono={Users}
        titulo="Todavía no hay candidatos derivados."
        descripcion="Van a aparecer acá cuando la Oficina de Empleo los derive para esta oferta."
      />
    );
  }

  const nombresMap: Record<string, Pick<FilaCandidatoParaEmpresa, "nombre" | "apellido">> = {};
  const uniquePostulanteIds = [
    ...new Set(derivaciones.map((d) => d.postulante_id)),
  ];
  const [nombreResults, fotos] = await Promise.all([
    Promise.all(
      uniquePostulanteIds.map((pid) =>
        supabase.rpc("candidato_para_empresa", { p_postulante_id: pid })
      )
    ),
    fotosDeCandidatosEmpresa(uniquePostulanteIds),
  ]);
  uniquePostulanteIds.forEach((pid, i) => {
    const row = nombreResults[i].data?.[0];
    if (row) nombresMap[pid] = row;
  });

  const total = resultado.total;

  return (
    <>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {total === 1 ? "1 candidato" : `${total} candidatos`} · la Oficina{" "}
        {total === 1 ? "lo preseleccionó" : "los preseleccionó"} para esta oferta.
      </p>

      <Tabla
        className="mt-4"
        columnas={COLUMNAS}
        etiqueta="Candidatos derivados"
        encabezados={["Candidato", "Derivado el", "Nota de la Oficina", "Estado", ""]}
      >
        {derivaciones.map((d) => {
          const candidato = nombresMap[d.postulante_id];
          const nombre = candidato ? `${candidato.nombre} ${candidato.apellido}` : "Candidato";
          const href = `/empresa/ofertas/${ofertaId}/candidatos/${d.derivacion_id}`;
          const conEntrevista =
            d.fecha_entrevista && d.estado_empresa !== "retirada_postulante";

          return (
            <FilaTabla key={d.derivacion_id}>
              <CeldaPersona
                nombre={nombre}
                href={href}
                foto={fotos.get(d.postulante_id)}
                iniciales={
                  candidato ? inicialesDePersona(candidato.nombre, candidato.apellido) : undefined
                }
              />
              <CeldaTabla etiqueta="Derivado el" rotuloVisible className="tabular-nums">
                {formatFecha(d.derivacion_created_at)}
              </CeldaTabla>
              <CeldaTabla etiqueta="Nota de la Oficina">
                {d.nota_municipalidad ? (
                  <span className="line-clamp-2 text-muted-foreground-strong" title={d.nota_municipalidad}>
                    {d.nota_municipalidad}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sin nota</span>
                )}
              </CeldaTabla>
              <CeldaTabla etiqueta="Estado" className="flex flex-col items-start gap-1.5">
                <Badge tono={DERIVACION_ESTADO_TONO[d.estado_empresa] ?? "neutral"} estado>
                  {DERIVACION_ESTADO_LABEL[d.estado_empresa] ?? d.estado_empresa}
                </Badge>
                {conEntrevista && (
                  <span className="text-[13px] text-muted-foreground">
                    Entrevista: {formatFechaHora(d.fecha_entrevista)}
                    {d.modalidad_entrevista === "online"
                      ? " · Online"
                      : d.lugar_entrevista
                        ? ` · ${d.lugar_entrevista}`
                        : ""}
                  </span>
                )}
              </CeldaTabla>
              <Link href={href} className={`btn-neutro ${CLASE_ACCION_FILA}`}>
                Ver candidato
                <span className="sr-only">: {nombre}</span>
              </Link>
            </FilaTabla>
          );
        })}
      </Tabla>

      <Paginacion
        className="mt-6"
        ruta={`/empresa/ofertas/${ofertaId}`}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
        ancla="candidatos"
        variante="numeros"
      />
    </>
  );
}
