import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { formatFecha, formatFechaHora } from "@/lib/fechas";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { DERIVACION_ESTADO_LABEL, DERIVACION_ESTADO_TONO } from "@/lib/derivacion-estados";
import { Badge } from "@/components/ui/badge";
import { Aviso } from "@/components/ui/aviso";
import { DatosClave } from "@/components/ui/datos-clave";
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
  ESTADO_OFERTA_EMPRESA_TONO,
  type EstadoOfertaEmpresa,
} from "@/lib/oferta-estados";
import { inicialesDePersona } from "@/lib/iniciales";
import { RenovarOfertaBtn } from "../_components/renovar-oferta-btn";
import { BajaOfertaBtn } from "../_components/baja-oferta-btn";
import { bajasDeOfertas } from "@/lib/empresa/bajas-oferta";
import { BotonVolver } from "@/components/ui/boton-volver";
import { fotosDeCandidatosEmpresa } from "@/lib/fotos-perfil";

export const metadata: Metadata = {
  title: "Detalle de oferta | Portal de Empleo Funes",
};

// Candidato | Derivado el | Nota de la Oficina | Estado | acción.
const COLUMNAS = "minmax(0,1.5fr) 7.5rem minmax(0,2fr) minmax(0,1.3fr) auto";

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

  return (
    <section className="w-full">
      <BotonVolver href="/empresa/ofertas" destacado />

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-[-0.01em] break-words text-heading sm:text-[32px]">
              {oferta.titulo}
            </h1>
            <Badge tono={ESTADO_OFERTA_EMPRESA_TONO[estadoVisible] ?? "neutral"} estado>
              {ESTADO_OFERTA_EMPRESA_LABEL[estadoVisible] ?? estadoVisible}
            </Badge>
          </div>
          <p className="mt-1.5 text-base text-muted-foreground">
            {fechaAlta}
            {fechaVence && ` · ${fechaVence}`}
            {porVencer && diasRestantes !== null && (
              <span className="font-semibold text-warning-text">
                {" · "}
                {textoDiasRestantes(diasRestantes)}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 empty:hidden *:grow *:basis-32 sm:shrink-0 sm:justify-end sm:*:grow-0 sm:*:basis-auto">
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
        </div>
      </header>

      {oferta.estado === "rechazada" && (
        <Aviso tono="danger" titulo="La Oficina de Empleo rechazó esta oferta" className="mt-6">
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

      <section aria-labelledby="datos-oferta" className="tarjeta mt-6 p-5 sm:p-6">
        <h2 id="datos-oferta" className="text-xl font-extrabold text-heading">
          Datos de la oferta
        </h2>
        <DatosClave
          className="mt-4"
          datos={[
            { etiqueta: "Rubro", valor: rubros.length > 0 ? rubros.join(", ") : "—" },
            { etiqueta: "Modalidad", valor: oferta.modalidad },
            { etiqueta: "Jornada", valor: oferta.jornada },
            { etiqueta: "Ubicación", valor: oferta.ubicacion || "—" },
            { etiqueta: "Vencimiento", valor: oferta.vence_en ? formatFecha(oferta.vence_en) : "—" },
            {
              etiqueta: "Vacantes",
              valor:
                vacantes !== null
                  ? `${vacantes} · ${contratados} ${contratados === 1 ? "cubierta" : "cubiertas"}`
                  : null,
            },
          ]}
        />
        <hr className="my-6 border-border" />
        <div className="flex flex-col gap-6">
          <SeccionTexto titulo="Descripción">
            <p className="text-base leading-[1.6] whitespace-pre-line break-words text-texto-parrafo">
              {oferta.descripcion}
            </p>
          </SeccionTexto>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <SeccionTexto titulo="Requisitos">
              <ListaTexto items={oferta.requisitos} />
            </SeccionTexto>
            <SeccionTexto titulo="Beneficios">
              <ListaTexto items={oferta.beneficios ?? []} />
            </SeccionTexto>
          </div>
        </div>
      </section>

      <section id="candidatos" aria-labelledby="candidatos-titulo" className="mt-10 scroll-mt-20">
        <h2 id="candidatos-titulo" className="text-[22px] leading-tight font-extrabold text-heading">
          Candidatos derivados por la Oficina de Empleo
        </h2>
        <Suspense key={pagina} fallback={<EsqueletoLista filas={3} className="mt-4" />}>
          <ListadoDerivados ofertaId={ofertaId} pagina={pagina} searchParams={sp} />
        </Suspense>
      </section>
    </section>
  );
}

function SeccionTexto({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <h3 className="text-lg font-extrabold text-heading">{titulo}</h3>
      {children}
    </section>
  );
}

function ListaTexto({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-base text-texto-parrafo">-</p>;
  return (
    <ul className="flex list-disc flex-col gap-2 pl-[22px] text-base leading-[1.6] break-words text-texto-parrafo marker:text-primary">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
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
        titulo="Todavía no hay candidatos derivados"
        descripcion="La Oficina de Empleo te enviará perfiles cuando los tenga disponibles."
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
                    {d.lugar_entrevista ? ` · ${d.lugar_entrevista}` : ""}
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
