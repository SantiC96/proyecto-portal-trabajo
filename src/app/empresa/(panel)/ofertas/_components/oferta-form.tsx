"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, MapPin, Info, Send, Circle, CircleCheck } from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { LARGO_MAXIMO, validarOferta, type OfertaData } from "@/lib/validaciones";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import {
  crearOferta,
  editarOferta,
  enviarBorrador,
  guardarBorrador,
} from "@/app/empresa/(panel)/ofertas/actions";
import { type ErrorAccion, type Resultado, toErrorAccion } from "@/lib/resultado";
import {
  DURACIONES_OFERTA,
  DURACION_OFERTA_POR_DEFECTO,
  esDuracionOferta,
  venceSiSeApruebaEn,
} from "@/lib/ofertas-vencimiento";
import { formatFecha } from "@/lib/fechas";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import type { Tabla } from "@/types/db";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Aviso } from "@/components/ui/aviso";
import { Franja } from "@/components/ui/franja";
import { SeccionNumerada } from "@/components/ui/seccion-numerada";
import { clasePastilla } from "@/components/ui/pastilla-filtro";
import { TarjetaOferta } from "@/components/ofertas/tarjeta-oferta";
import { marcarNavegacionDelUsuario } from "@/lib/navegacion-interna";

type Categoria = Pick<Tabla<"categorias">, "id" | "nombre">;

interface OfertaFormProps {
  categorias: Categoria[];
  /** Razón social de la empresa, para la vista previa. */
  empresaNombre: string;
  ofertaId?: string;
  valorInicial?: Partial<OfertaData>;
  estaPublicada?: boolean;
  /** vence_en de la oferta publicada que se edita. */
  venceEn?: string | null;
  /** La oferta que se edita es un borrador (migration_051). */
  esBorrador?: boolean;
  /** La oferta que se edita fue rechazada por la oficina; su motivo. */
  motivoRechazo?: string | null;
  minimoVacantes?: number;
}

const MODALIDADES = ["Presencial", "Híbrido", "Remoto"] as const;
const JORNADAS = ["Tiempo completo", "Part-time", "Pasantía", "Por proyecto"] as const;
// La ubicación no se elige: el servidor la fija (UBICACION_OFERTA en actions.ts).
const UBICACION = "Funes, Santa Fe";
const MAXIMO_ITEMS = 15;
const MAXIMO_RUBROS = 5;

const CAMPOS: readonly (keyof OfertaData)[] = [
  "titulo",
  "descripcion",
  "categorias",
  "modalidad",
  "jornada",
  "cantidadVacantes",
  "duracionDias",
  "requisitos",
  "beneficios",
];

function entre(valor: number, minimo: number, maximo: number): boolean {
  return valor >= minimo && valor <= maximo;
}

export function OfertaForm({
  categorias,
  empresaNombre,
  ofertaId,
  valorInicial,
  estaPublicada,
  venceEn,
  esBorrador = false,
  motivoRechazo,
  minimoVacantes = 1,
}: OfertaFormProps) {
  const router = useRouter();
  const { pendiente: isPending, ejecutar } = useAccion();
  // Qué botón disparó el envío en curso, para mostrar la carga en ese.
  const [modoEnCurso, setModoEnCurso] = useState<"revision" | "borrador">("revision");
  // Un borrador nuevo o existente admite "Guardar borrador"; una oferta ya
  // enviada se edita como hasta ahora.
  const admiteBorrador = !ofertaId || esBorrador;
  const [error, setError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<keyof OfertaData>();
  const errorRef = useRef<HTMLDivElement>(null);
  // Aviso "Faltan datos…": se muestra después de un envío con campos marcados
  // y se va solo cuando se corrigen todos.
  const [envioConErrores, setEnvioConErrores] = useState(false);
  const avisoCamposRef = useRef<HTMLDivElement>(null);
  // Una clave por formulario abierto: si el mismo envío llega dos veces, la
  // base crea una sola oferta (migration_040).
  const [claveEnvio] = useState(() => crypto.randomUUID());
  // Para "Si la Oficina la aprueba hoy, vence el …".
  const [abiertoEn] = useState(() => Date.now());

  const [titulo, setTitulo] = useState(valorInicial?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(valorInicial?.descripcion ?? "");
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>(
    valorInicial?.categorias ?? []
  );
  const [modalidad, setModalidad] = useState(valorInicial?.modalidad ?? "Presencial");
  const [jornada, setJornada] = useState(valorInicial?.jornada ?? "Tiempo completo");
  const [requisitos, setRequisitos] = useState<string[]>(valorInicial?.requisitos ?? []);
  const [beneficios, setBeneficios] = useState<string[]>(valorInicial?.beneficios ?? []);
  const [nuevoRequisito, setNuevoRequisito] = useState("");
  const [nuevoBeneficio, setNuevoBeneficio] = useState("");
  const [cantidadVacantes, setCantidadVacantes] = useState(
    valorInicial?.cantidadVacantes ?? 1
  );
  const [duracionDias, setDuracionDias] = useState<number>(
    valorInicial?.duracionDias ?? DURACION_OFERTA_POR_DEFECTO
  );

  const cantidadCamposConError = Object.keys(campos.errores).length;

  function agregarRequisito() {
    const val = nuevoRequisito.trim();
    if (!val || requisitos.length >= MAXIMO_ITEMS) return;
    setRequisitos([...requisitos, val]);
    setNuevoRequisito("");
  }

  function agregarBeneficio() {
    const val = nuevoBeneficio.trim();
    if (!val || beneficios.length >= MAXIMO_ITEMS) return;
    setBeneficios([...beneficios, val]);
    setNuevoBeneficio("");
  }

  /** Agrega a las listas lo que quedó escrito sin tocar "Agregar". */
  function datosDelFormulario(): OfertaData {
    const reqFinal = [...requisitos];
    const reqPendiente = nuevoRequisito.trim();
    if (reqPendiente && !reqFinal.includes(reqPendiente) && reqFinal.length < MAXIMO_ITEMS) {
      reqFinal.push(reqPendiente);
      setRequisitos(reqFinal);
      setNuevoRequisito("");
    }

    const benFinal = [...beneficios];
    const benPendiente = nuevoBeneficio.trim();
    if (benPendiente && !benFinal.includes(benPendiente) && benFinal.length < MAXIMO_ITEMS) {
      benFinal.push(benPendiente);
      setBeneficios(benFinal);
      setNuevoBeneficio("");
    }

    return {
      titulo,
      descripcion,
      categorias: categoriasSeleccionadas,
      modalidad,
      jornada,
      requisitos: reqFinal,
      beneficios: benFinal,
      cantidadVacantes,
      duracionDias,
    };
  }

  /** Muestra el aviso de campos marcados y lo enfoca (después del foco al primer campo). */
  function avisarCamposMarcados() {
    setEnvioConErrores(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => avisoCamposRef.current?.focus())
    );
  }

  function mostrarError(result: Resultado<unknown>) {
    if (result.ok) return;
    if (campos.tomarDelServidor(result, CAMPOS)) {
      avisarCamposMarcados();
      return;
    }
    setError(toErrorAccion(result));
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnvioConErrores(false);
    const form = e.currentTarget;
    const data = datosDelFormulario();

    const completos = campos.validar(
      {
        titulo,
        descripcion,
        categorias: categoriasSeleccionadas,
        modalidad,
        jornada,
        requisitos: data.requisitos,
      },
      form
    );
    if (!completos) {
      avisarCamposMarcados();
      return;
    }

    const errorValidacion = validarOferta(data);
    if (errorValidacion) {
      campos.marcar(errorValidacion.campo, errorValidacion.mensaje, form);
      avisarCamposMarcados();
      return;
    }

    setModoEnCurso("revision");
    ejecutar(async () => {
      const result = !ofertaId
        ? await crearOferta(data, claveEnvio)
        : esBorrador
          ? await enviarBorrador(ofertaId, data, claveEnvio)
          : await editarOferta(ofertaId, data);

      if (!result.ok) return mostrarError(result);
      router.push("/empresa/ofertas?aviso=enviada");
    });
  }

  /** El borrador solo exige el título; el resto se completa después. */
  function guardarComoBorrador(e: React.MouseEvent<HTMLButtonElement>) {
    setError(null);
    setEnvioConErrores(false);
    const form = e.currentTarget.form;
    const data = datosDelFormulario();
    if (!campos.validar({ titulo }, form)) return;

    setModoEnCurso("borrador");
    ejecutar(async () => {
      const result = await guardarBorrador(data, claveEnvio, ofertaId);
      if (!result.ok) return mostrarError(result);
      router.push("/empresa/ofertas?aviso=borrador");
    });
  }

  const nombresRubros = categoriasSeleccionadas
    .map((id) => categorias.find((c) => c.id === id)?.nombre)
    .filter((n): n is string => Boolean(n));

  // "Completa" con las mismas reglas de validarOferta. Lo escrito en
  // requisitos sin tocar "Agregar" cuenta: se agrega al enviar.
  const largoTitulo = titulo.trim().length;
  const largoDescripcion = descripcion.trim().length;
  const cantidadRequisitos = requisitos.length + (nuevoRequisito.trim() ? 1 : 0);
  const secciones = [
    {
      id: "seccion-puesto",
      titulo: "El puesto",
      completa:
        entre(largoTitulo, 5, LARGO_MAXIMO.tituloOferta) &&
        entre(largoDescripcion, 30, LARGO_MAXIMO.descripcion),
    },
    {
      id: "seccion-rubros",
      titulo: "Rubros",
      completa: entre(categoriasSeleccionadas.length, 1, MAXIMO_RUBROS),
    },
    {
      id: "seccion-condiciones",
      titulo: "Condiciones",
      completa:
        MODALIDADES.some((m) => m === modalidad) && JORNADAS.some((j) => j === jornada),
    },
    {
      id: "seccion-requisitos",
      titulo: "Requisitos",
      completa: entre(cantidadRequisitos, 1, MAXIMO_ITEMS),
    },
    // Opcional: vacía también es válida.
    { id: "seccion-beneficios", titulo: "Beneficios (opcional)", completa: true },
    {
      id: "seccion-publicacion",
      titulo: "Publicación",
      completa:
        Number.isInteger(cantidadVacantes) &&
        cantidadVacantes >= minimoVacantes &&
        esDuracionOferta(duracionDias),
    },
  ];
  const cantidadCompletas = secciones.filter((s) => s.completa).length;

  const venceActual = estaPublicada && venceEn ? venceEn : null;
  const yaVencio = venceActual !== null && new Date(venceActual).getTime() <= abiertoEn;
  const textoVencimiento = venceActual
    ? `${yaVencio ? "Venció" : "Vence"} el ${formatFecha(venceActual)}.`
    : estaPublicada
      ? null
      : `Si la Oficina la aprueba hoy, vence el ${formatFecha(
          venceSiSeApruebaEn(abiertoEn, duracionDias).toISOString()
        )}.`;

  return (
    <form onSubmit={handleSubmit} noValidate className="formulario-oferta flex flex-col gap-6">
      {estaPublicada && (
        <Franja tono="aviso" titulo="Al guardar, la oferta vuelve a revisión de la Oficina.">
          Mientras la revisa, deja de verse en el portal y no recibe postulaciones nuevas. Si la
          aprueba antes de que venza, conserva su fecha de vencimiento.
        </Franja>
      )}

      {motivoRechazo && (
        <Franja tono="error">
          <p>
            <strong className="font-bold">La Oficina de Empleo rechazó esta oferta.</strong>{" "}
            Motivo: {motivoRechazo}
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("titulo")?.focus()}
            className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-surface px-4 text-[15px] font-bold text-danger outline-none hover:bg-danger-fondo focus-visible:shadow-[0_0_0_3px_rgb(255_255_255/0.6)]"
          >
            Corregir y reenviar
          </button>
        </Franja>
      )}

      {envioConErrores && cantidadCamposConError > 0 && (
        <Aviso ref={avisoCamposRef} tabIndex={-1} tono="danger" className="outline-none">
          Faltan datos para enviar la oferta.{" "}
          {cantidadCamposConError === 1
            ? "Revisá el campo marcado."
            : `Revisá los ${cantidadCamposConError} campos marcados.`}
        </Aviso>
      )}

      {/* Fila 1: puesto y rubros | vista previa y progreso, con la misma
          altura (la fila estira las dos columnas y crecen la descripción y la
          vista previa). Fila 2: el resto a todo el ancho. En el celular, una
          columna en el orden del DOM. En escritorio, xl:mt-5 suma 20 px a los
          24 px del gap de arriba (banda o aviso) para que el rótulo "Vista
          previa" (16 px de alto, 8 px sobre la tarjeta) quede a 20 px. */}
      <div className="grid grid-cols-1 gap-x-7 gap-y-5 xl:mt-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <SeccionNumerada
            numero={1}
            id="seccion-puesto"
            titulo="El puesto"
            descripcion="Cómo se llama el puesto y qué tareas incluye."
            className="xl:flex xl:flex-1 xl:flex-col"
            classNameCuerpo="xl:flex xl:flex-1 xl:flex-col"
          >
            <div className="flex flex-col gap-5 xl:flex-1">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="titulo" className="etiqueta-campo">
                  Título del puesto <Obligatorio />
                </label>
                <input
                  id="titulo"
                  type="text"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    campos.limpiar("titulo");
                  }}
                  placeholder="Ej: Vendedor/a de salón"
                  maxLength={LARGO_MAXIMO.tituloOferta}
                  className="campo"
                  {...ariaErrorCampo("titulo", campos.errores.titulo)}
                />
                <ErrorCampo idCampo="titulo" mensaje={campos.errores.titulo} />
              </div>

              <div className="flex flex-col gap-1.5 xl:flex-1">
                <label htmlFor="descripcion" className="etiqueta-campo">
                  Descripción del puesto <Obligatorio />
                </label>
                <textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value);
                    campos.limpiar("descripcion");
                  }}
                  placeholder="Describí las tareas, responsabilidades y el contexto del puesto..."
                  rows={6}
                  maxLength={LARGO_MAXIMO.descripcion}
                  className="campo min-h-[132px] resize-y xl:flex-1 xl:resize-none"
                  {...ariaErrorCampo("descripcion", campos.errores.descripcion)}
                />
                <div className="flex items-start justify-between gap-3">
                  <ErrorCampo idCampo="descripcion" mensaje={campos.errores.descripcion} />
                  <ContadorCaracteres
                    className="ml-auto text-[13px]"
                    actual={descripcion.length}
                    maximo={LARGO_MAXIMO.descripcion}
                  />
                </div>
              </div>
            </div>
          </SeccionNumerada>

          <SeccionNumerada
            numero={2}
            id="seccion-rubros"
            titulo="Rubros"
            descripcion="Elegí uno o más. Los postulantes de esos rubros van a ver la oferta primero."
          >
            <SelectorRubros
              categorias={categorias}
              seleccionados={categoriasSeleccionadas}
              onChange={(ids) => {
                setCategoriasSeleccionadas(ids);
                campos.limpiar("categorias");
              }}
              error={campos.errores.categorias}
            />
          </SeccionNumerada>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {/* Copia visual (inert): el formulario es la única fuente de los
              datos. En escritorio el rótulo va por fuera (absolute) para que
              los bordes de las dos columnas coincidan. */}
          <section
            aria-labelledby="vista-previa-titulo"
            className="relative flex flex-col gap-2 xl:flex-1 xl:gap-0"
          >
            <h2
              id="vista-previa-titulo"
              className="text-xs leading-4 font-extrabold tracking-[0.06em] text-neutral uppercase xl:absolute xl:bottom-[calc(100%+8px)] xl:left-0"
            >
              Vista previa
            </h2>
            <div
              inert
              className="vista-previa-oferta flex flex-col xl:flex-1"
              data-sin-titulo={titulo.trim() ? undefined : ""}
              data-sin-rubro={nombresRubros.length > 0 ? undefined : ""}
            >
              <TarjetaOferta
                href="#"
                titulo={titulo.trim() || "Título del puesto"}
                empresa={empresaNombre}
                rubros={nombresRubros.length > 0 ? nombresRubros : ["Rubro"]}
                modalidad={modalidad}
                jornada={jornada}
                lugar={UBICACION}
                className="xl:flex-1"
              />
            </div>
          </section>

          <section aria-labelledby="progreso-titulo" className="tarjeta px-4 py-5 sm:p-6">
            <h2 id="progreso-titulo" className="text-base leading-snug font-extrabold text-heading">
              {cantidadCompletas} de {secciones.length} secciones completas
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {secciones.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 text-[15px]">
                  {s.completa ? (
                    <CircleCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span
                    className={
                      s.completa ? "font-semibold text-foreground" : "text-muted-foreground"
                    }
                  >
                    {s.titulo}
                  </span>
                  <span className="sr-only">{s.completa ? ": completa" : ": pendiente"}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="@container flex min-w-0 flex-col gap-5 xl:col-span-2">
          <SeccionNumerada
            numero={3}
            id="seccion-condiciones"
            titulo="Condiciones"
            descripcion="La modalidad, la jornada y el lugar de trabajo."
          >
            <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-2">
              <GrupoOpciones
                id="modalidad"
                titulo="Modalidad"
                opciones={MODALIDADES}
                valor={modalidad}
                onElegir={(v) => {
                  setModalidad(v);
                  campos.limpiar("modalidad");
                }}
                error={campos.errores.modalidad}
              />
              <GrupoOpciones
                id="jornada"
                titulo="Jornada"
                opciones={JORNADAS}
                valor={jornada}
                onElegir={(v) => {
                  setJornada(v);
                  campos.limpiar("jornada");
                }}
                error={campos.errores.jornada}
              />
              <div className="flex flex-col gap-1.5 @3xl:col-span-2">
                <p id="ubicacion-etiqueta" className="etiqueta-campo">
                  Ubicación
                </p>
                <div
                  aria-labelledby="ubicacion-etiqueta"
                  aria-describedby="ubicacion-ayuda"
                  role="group"
                  className="flex min-h-12 items-center gap-2 rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-borde-campo-oferta bg-campo-lectura px-3.5 text-[15px] text-muted-foreground-strong"
                >
                  <MapPin className="size-[18px] shrink-0 text-primary" aria-hidden="true" />
                  {UBICACION}
                </div>
                <p id="ubicacion-ayuda" className="text-sm text-muted-foreground">
                  No se puede cambiar: el portal publica ofertas para trabajar en Funes.
                </p>
              </div>
            </div>
          </SeccionNumerada>

          <div className="grid grid-cols-1 gap-5 @4xl:grid-cols-2">
            <SeccionNumerada
              numero={4}
              id="seccion-requisitos"
              titulo="Requisitos"
              descripcion="Lo que tiene que tener la persona para el puesto."
            >
              <ListaItems
                id="requisitos"
                etiqueta="Requisito"
                obligatorio
                items={requisitos}
                nuevo={nuevoRequisito}
                onNuevo={(v) => {
                  setNuevoRequisito(v);
                  campos.limpiar("requisitos");
                }}
                onAgregar={agregarRequisito}
                onQuitar={(i) => setRequisitos(requisitos.filter((_, j) => j !== i))}
                placeholder="Ej: Secundario completo, experiencia en ventas…"
                textoAgregar="Agregar requisito"
                textoQuitar="Quitar requisito"
                ayuda="Escribí un requisito y tocá Agregar o presioná Enter. Podés cargar varios."
                error={campos.errores.requisitos}
              />
            </SeccionNumerada>

            <SeccionNumerada
              numero={5}
              id="seccion-beneficios"
              titulo="Beneficios (opcional)"
              descripcion="Lo que la empresa ofrece además del sueldo."
            >
              <ListaItems
                id="beneficios"
                etiqueta="Beneficio"
                items={beneficios}
                nuevo={nuevoBeneficio}
                onNuevo={(v) => {
                  setNuevoBeneficio(v);
                  campos.limpiar("beneficios");
                }}
                onAgregar={agregarBeneficio}
                onQuitar={(i) => setBeneficios(beneficios.filter((_, j) => j !== i))}
                placeholder="Ej: Obra social, flexibilidad horaria, comedor…"
                textoAgregar="Agregar beneficio"
                textoQuitar="Quitar beneficio"
                ayuda="Escribí un beneficio y tocá Agregar o presioná Enter. Podés cargar varios."
                error={campos.errores.beneficios}
              />
            </SeccionNumerada>
          </div>

          <SeccionNumerada
            numero={6}
            id="seccion-publicacion"
            titulo="Publicación"
            descripcion="Cuántas personas buscás y cuánto tiempo se publica la oferta."
          >
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[auto_minmax(0,1fr)] @3xl:gap-x-10">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vacantes" className="etiqueta-campo">
                    Cantidad de personas a contratar <Obligatorio />
                  </label>
                  <input
                    id="vacantes"
                    type="number"
                    inputMode="numeric"
                    min={minimoVacantes}
                    value={cantidadVacantes}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setCantidadVacantes(v);
                      campos.limpiar("cantidadVacantes");
                    }}
                    className="campo w-40"
                    {...ariaErrorCampo("vacantes", campos.errores.cantidadVacantes)}
                  />
                  <ErrorCampo idCampo="vacantes" mensaje={campos.errores.cantidadVacantes} />
                  <p className="text-sm text-muted-foreground">No se muestra a los postulantes.</p>
                  {minimoVacantes > 1 && (
                    <p className="text-sm text-warning-text">
                      Ya tenés {minimoVacantes} {minimoVacantes === 1 ? "candidato seleccionado" : "candidatos seleccionados"}. La cantidad no puede ser menor.
                    </p>
                  )}
                </div>

                <GrupoOpciones
                  id="duracion"
                  titulo="Duración de la publicación"
                  opciones={DURACIONES_OFERTA.map(String)}
                  etiquetaOpcion={(d) => `${d} días`}
                  valor={String(duracionDias)}
                  onElegir={(v) => {
                    setDuracionDias(Number(v));
                    campos.limpiar("duracionDias");
                  }}
                  error={campos.errores.duracionDias}
                />
              </div>

              <div className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-primary/7 px-4 py-3.5">
                <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="flex min-w-0 flex-col gap-1">
                  {textoVencimiento && (
                    <p aria-live="polite" className="text-[15px] font-semibold text-heading">
                      {textoVencimiento}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground-strong">
                    Se cuenta desde que la Oficina de Empleo aprueba la oferta. Cuando vence, deja
                    de verse en el portal y podés renovarla por el mismo plazo.
                    {estaPublicada && " Cambiar la duración no modifica el vencimiento actual."}
                  </p>
                </div>
              </div>
            </div>
          </SeccionNumerada>
        </div>

        {error && (
          <Aviso ref={errorRef} tono="danger" className="xl:col-span-2">
            <p>{error.mensaje}</p>
            {error.ref && (
              <p className="mt-1 text-sm">
                Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
              </p>
            )}
          </Aviso>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end xl:col-span-2">
          <Button
            type="button"
            variant="outline"
            className="btn-cancelar"
            onClick={() => {
              marcarNavegacionDelUsuario();
              router.push("/empresa/ofertas");
            }}
            disabled={isPending}
          >
            Cancelar
          </Button>
          {admiteBorrador && (
            <button
              type="button"
              onClick={guardarComoBorrador}
              disabled={isPending}
              aria-busy={isPending && modoEnCurso === "borrador"}
              className="btn-secundario"
            >
              {isPending && modoEnCurso === "borrador" && <Spinner />}
              {isPending && modoEnCurso === "borrador" ? "Guardando…" : "Guardar borrador"}
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            aria-busy={isPending && modoEnCurso === "revision"}
            className="btn-primario"
          >
            {isPending && modoEnCurso === "revision" ? (
              <>
                <Spinner />
                Enviando…
              </>
            ) : ofertaId && !esBorrador ? (
              "Guardar cambios"
            ) : (
              <>
                <Send aria-hidden="true" />
                Enviar a revisión
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

/**
 * Rubros elegidos como chips (cada uno con su "×") y "Agregar rubro", que
 * muestra el buscador de siempre. Sin rubros, el buscador queda a la vista:
 * es donde va el foco si el envío marca el campo.
 */
function SelectorRubros({
  categorias,
  seleccionados,
  onChange,
  error,
}: {
  categorias: Categoria[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const [buscando, setBuscando] = useState(false);
  // El buscador se abre desde "Agregar rubro" (no al cargar la página).
  const [abrirAlMontar, setAbrirAlMontar] = useState(false);
  const listaRef = useRef<HTMLUListElement>(null);
  const agregarRef = useRef<HTMLButtonElement>(null);
  const mostrarBuscador = seleccionados.length === 0 || buscando;

  function nombre(id: string): string {
    return categorias.find((c) => c.id === id)?.nombre ?? "";
  }

  function quitar(id: string, indice: number) {
    onChange(seleccionados.filter((s) => s !== id));
    // El foco pasa al "×" que quedó en ese lugar, al anterior o al buscador.
    requestAnimationFrame(() => {
      const botones = listaRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [];
      const siguiente = botones[Math.min(indice, botones.length - 1)];
      if (siguiente) siguiente.focus();
      else (agregarRef.current ?? document.getElementById("categorias"))?.focus();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <span id="categorias-etiqueta" className="etiqueta-campo">
        Rubros de la oferta <Obligatorio />
        <span className="ml-2 text-sm font-normal text-muted-foreground">(1 a {MAXIMO_RUBROS})</span>
      </span>

      {seleccionados.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* role="list": con display: contents, Safari pierde la semántica de la lista. */}
          <ul ref={listaRef} role="list" aria-labelledby="categorias-etiqueta" className="contents">
            {seleccionados.map((id, i) => (
              <li
                key={id}
                className="inline-flex h-11 max-w-full min-w-0 items-center gap-1 rounded-full border-[1.5px] border-primary/35 bg-primary/10 pr-1 pl-4 text-[15px] font-semibold text-primary-hover"
              >
                <span className="min-w-0 truncate">{nombre(id)}</span>
                <button
                  type="button"
                  onClick={() => quitar(id, i)}
                  aria-label={`Quitar ${nombre(id)}`}
                  title={`Quitar ${nombre(id)}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-primary/15 focus-visible:shadow-[var(--sombra-foco)]"
                >
                  <X className="size-[18px]" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {!mostrarBuscador && (
            <button
              ref={agregarRef}
              type="button"
              onClick={() => {
                setAbrirAlMontar(true);
                setBuscando(true);
              }}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-primary bg-surface px-4 text-[15px] font-bold text-primary outline-none transition-colors hover:bg-primary/7 focus-visible:shadow-[var(--sombra-foco)]"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
              Agregar rubro
            </button>
          )}
        </div>
      )}

      {mostrarBuscador && (
        <MultiCombobox
          id="categorias"
          opciones={categorias}
          seleccionados={seleccionados}
          onChange={onChange}
          sinChips
          abrirAlMontar={abrirAlMontar}
          onOpenChange={(abierto) => {
            if (abierto) {
              setBuscando(true);
              return;
            }
            if (seleccionados.length === 0) return;
            const teniaFoco = document.activeElement?.id === "categorias";
            setBuscando(false);
            setAbrirAlMontar(false);
            if (teniaFoco) requestAnimationFrame(() => agregarRef.current?.focus());
          }}
          placeholder="Buscá o elegí un rubro..."
          vacioTexto="No hay rubros que coincidan"
          ariaInput={{
            "aria-labelledby": "categorias-etiqueta",
            ...ariaErrorCampo("categorias", error),
          }}
        />
      )}
      <ErrorCampo idCampo="categorias" mensaje={error} />
    </div>
  );
}

/**
 * Opciones en pastillas de 44 px que se comportan como radios: una sola
 * elegida, un solo paso de tabulación y las flechas para cambiar (como un
 * grupo de radios nativo). El valor viaja en un input oculto con el name.
 */
function GrupoOpciones({
  id,
  titulo,
  opciones,
  etiquetaOpcion = (o) => o,
  valor,
  onElegir,
  error,
}: {
  id: string;
  titulo: string;
  opciones: readonly string[];
  etiquetaOpcion?: (opcion: string) => string;
  valor: string;
  onElegir: (valor: string) => void;
  error?: string;
}) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const indiceElegido = opciones.indexOf(valor);

  function elegir(indice: number) {
    onElegir(opciones[indice]);
    botones.current[indice]?.focus();
  }

  function alPresionar(e: React.KeyboardEvent<HTMLButtonElement>, indice: number) {
    const ultimo = opciones.length - 1;
    let destino: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") destino = indice === ultimo ? 0 : indice + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") destino = indice === 0 ? ultimo : indice - 1;
    else if (e.key === "Home") destino = 0;
    else if (e.key === "End") destino = ultimo;
    if (destino === null) return;
    e.preventDefault();
    elegir(destino);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={`${id}-etiqueta`} className="etiqueta-campo">
        {titulo} <Obligatorio />
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-etiqueta`}
        aria-required="true"
        // Para que el foco del primer error pueda llegar al grupo.
        tabIndex={-1}
        className="flex flex-wrap gap-2 rounded-[22px] outline-none focus:shadow-[var(--sombra-foco)]"
        {...ariaErrorCampo(id, error)}
      >
        {opciones.map((o, i) => {
          const elegida = i === indiceElegido;
          const enfocable = elegida || (indiceElegido === -1 && i === 0);
          return (
            <button
              key={o}
              ref={(el) => {
                botones.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={elegida}
              tabIndex={enfocable ? 0 : -1}
              onClick={() => elegir(i)}
              onKeyDown={(e) => alPresionar(e, i)}
              className={clasePastilla(elegida, "cursor-pointer sm:h-11")}
            >
              {etiquetaOpcion(o)}
            </button>
          );
        })}
      </div>
      <input type="hidden" name={id} value={valor} />
      <ErrorCampo idCampo={id} mensaje={error} />
    </div>
  );
}

/** Lista de requisitos o beneficios: los cargados, cada uno con su botón para quitarlo, y el campo para agregar. */
function ListaItems({
  id,
  etiqueta,
  obligatorio = false,
  items,
  nuevo,
  onNuevo,
  onAgregar,
  onQuitar,
  placeholder,
  textoAgregar,
  textoQuitar,
  ayuda,
  error,
}: {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  items: string[];
  nuevo: string;
  onNuevo: (valor: string) => void;
  onAgregar: () => void;
  onQuitar: (indice: number) => void;
  placeholder: string;
  textoAgregar: string;
  textoQuitar: string;
  ayuda: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex min-h-12 items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface-tinted py-1 pr-1 pl-3.5 text-[15px] text-foreground"
            >
              <span className="min-w-0 flex-1 break-words">{item}</span>
              <button
                type="button"
                onClick={() => onQuitar(i)}
                aria-label={textoQuitar}
                title={textoQuitar}
                className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-muted-foreground outline-none transition-colors hover:bg-danger-fondo hover:text-danger focus-visible:shadow-[var(--sombra-foco)]"
              >
                <X className="size-[18px]" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length < MAXIMO_ITEMS && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="etiqueta-campo">
            {etiqueta} {obligatorio && <Obligatorio />}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (hasta {MAXIMO_ITEMS})
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={id}
              type="text"
              value={nuevo}
              onChange={(e) => onNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAgregar();
                }
              }}
              placeholder={placeholder}
              maxLength={LARGO_MAXIMO.itemOferta}
              className="campo min-w-0 flex-1"
              {...ariaErrorCampo(id, error)}
            />
            <button
              type="button"
              onClick={onAgregar}
              disabled={!nuevo.trim()}
              className="btn-neutro min-h-12 shrink-0"
            >
              <Plus aria-hidden="true" />
              {textoAgregar}
            </button>
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{ayuda}</p>
      <ErrorCampo idCampo={id} mensaje={error} />
    </div>
  );
}
