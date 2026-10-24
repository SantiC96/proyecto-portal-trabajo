"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, MapPin, Info } from "lucide-react";
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
import { DURACIONES_OFERTA, DURACION_OFERTA_POR_DEFECTO } from "@/lib/ofertas-vencimiento";
import { formatFecha } from "@/lib/fechas";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import type { Tabla } from "@/types/db";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Aviso } from "@/components/ui/aviso";
import { Franja } from "@/components/ui/franja";
import { SeccionNumerada } from "@/components/ui/seccion-numerada";
import { clasePastilla } from "@/components/ui/pastilla-filtro";
import { TarjetaOferta } from "@/components/ofertas/tarjeta-oferta";
import { cn } from "@/lib/utils";
import { marcarNavegacionDelUsuario } from "@/lib/navegacion-interna";

type Categoria = Pick<Tabla<"categorias">, "id" | "nombre">;

interface OfertaFormProps {
  categorias: Categoria[];
  /** Razón social de la empresa, para la vista previa. */
  empresaNombre: string;
  ofertaId?: string;
  valorInicial?: Partial<OfertaData>;
  estaPublicada?: boolean;
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
const MS_POR_DIA = 86_400_000;

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

export function OfertaForm({
  categorias,
  empresaNombre,
  ofertaId,
  valorInicial,
  estaPublicada,
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
  const venceSiSeApruebaHoy = formatFecha(
    new Date(abiertoEn + duracionDias * MS_POR_DIA).toISOString()
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
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

      {estaPublicada && (
        <Franja tono="aviso" titulo="Al guardar, la oferta vuelve a revisión de la Oficina.">
          Mientras la revisa, deja de verse en el portal y no recibe postulaciones nuevas. Si la
          aprueba antes de que venza, conserva su fecha de vencimiento.
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="@container flex min-w-0 flex-col gap-6">
          <SeccionNumerada numero={1} id="seccion-puesto" titulo="El puesto">
            <div className="flex flex-col gap-5">
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

              <div className="flex flex-col gap-1.5">
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
                  className="campo resize-y"
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

          <SeccionNumerada numero={2} id="seccion-rubros" titulo="Rubros">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="categorias" className="etiqueta-campo">
                Rubros de la oferta <Obligatorio />
                <span className="ml-2 text-sm font-normal text-muted-foreground">(1 a 5)</span>
              </label>
              <p id="categorias-ayuda" className="text-sm text-muted-foreground">
                Elegí uno o más. Los postulantes de esos rubros van a ver la oferta primero.
              </p>
              <MultiCombobox
                id="categorias"
                opciones={categorias}
                seleccionados={categoriasSeleccionadas}
                onChange={(ids) => {
                  setCategoriasSeleccionadas(ids);
                  campos.limpiar("categorias");
                }}
                placeholder="Buscá o elegí un rubro..."
                vacioTexto="No hay rubros que coincidan"
                ariaInput={ariaErrorCampo("categorias", campos.errores.categorias)}
              />
              <ErrorCampo idCampo="categorias" mensaje={campos.errores.categorias} />
            </div>
          </SeccionNumerada>

          <SeccionNumerada numero={3} id="seccion-condiciones" titulo="Condiciones">
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
                <p className="etiqueta-campo">Ubicación</p>
                <div className="flex min-h-12 items-center gap-2 rounded-[var(--radius-lg)] border-[1.5px] border-border-strong bg-surface-tinted px-3.5 text-[15px] text-muted-foreground-strong">
                  <MapPin className="size-[18px] shrink-0 text-primary" aria-hidden="true" />
                  {UBICACION}
                </div>
              </div>
            </div>
          </SeccionNumerada>

          <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-2">
            <SeccionNumerada numero={4} id="seccion-requisitos" titulo="Requisitos">
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

            <SeccionNumerada numero={5} id="seccion-beneficios" titulo="Beneficios (opcional)">
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

          <SeccionNumerada numero={6} id="seccion-publicacion" titulo="Publicación">
            <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-2">
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
                  className="campo w-36"
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

              <div className="flex flex-col gap-2">
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
                {estaPublicada ? (
                  <p className="text-sm text-muted-foreground">
                    Se cuenta desde que la Oficina de Empleo aprueba la oferta. Cuando vence, deja
                    de verse en el portal y podés renovarla por el mismo plazo. Cambiarla no
                    modifica el vencimiento actual.
                  </p>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-control-foreground">
                      Si la Oficina la aprueba hoy, vence el {venceSiSeApruebaHoy}.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Se cuenta desde que la Oficina de Empleo aprueba la oferta. Cuando vence,
                      deja de verse en el portal y podés renovarla por el mismo plazo.
                    </p>
                  </>
                )}
              </div>
            </div>
          </SeccionNumerada>
        </div>

        {/* Vista previa: solo en escritorio. Es una copia visual (inert): el
            formulario de la izquierda es la única fuente de los datos. */}
        <aside aria-label="Vista previa" className="hidden xl:sticky xl:top-6 xl:flex xl:flex-col xl:gap-3">
          <h2 className="text-sm font-bold tracking-[0.06em] text-neutral uppercase">
            Vista previa
          </h2>
          <div inert>
            <TarjetaOferta
              href="#"
              titulo={titulo.trim() || "Título del puesto"}
              empresa={empresaNombre}
              rubros={nombresRubros}
              modalidad={modalidad}
              jornada={jornada}
              lugar={UBICACION}
            />
          </div>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            La Oficina de Empleo revisa cada oferta antes de publicarla.
          </p>
        </aside>
      </div>

      {error && (
        <Aviso ref={errorRef} tono="danger">
          <p>{error.mensaje}</p>
          {error.ref && (
            <p className="mt-1 text-sm">
              Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
            </p>
          )}
        </Aviso>
      )}

      <div className="tarjeta flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={() => {
            marcarNavegacionDelUsuario();
            router.push("/empresa/ofertas");
          }}
          disabled={isPending}
          className="btn-neutro sm:mr-auto"
        >
          Cancelar
        </button>
        {admiteBorrador && (
          <button
            type="button"
            onClick={guardarComoBorrador}
            disabled={isPending}
            aria-busy={isPending && modoEnCurso === "borrador"}
            className="btn-neutro"
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
          {isPending && modoEnCurso === "revision" && <Spinner />}
          {isPending && modoEnCurso === "revision"
            ? "Enviando…"
            : ofertaId && !esBorrador
              ? "Guardar cambios"
              : "Enviar a revisión"}
        </button>
      </div>
    </form>
  );
}

/** Opciones en pastillas (radios): una sola elegida. */
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
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="etiqueta-campo mb-2">
        {titulo} <Obligatorio />
      </legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const elegida = o === valor;
          return (
            <label
              key={o}
              className={cn(
                clasePastilla(elegida),
                "cursor-pointer has-[:focus-visible]:shadow-[var(--sombra-foco)]",
              )}
            >
              <input
                type="radio"
                name={id}
                value={o}
                checked={elegida}
                onChange={() => onElegir(o)}
                className="sr-only"
                {...ariaErrorCampo(id, error)}
              />
              {etiquetaOpcion(o)}
            </label>
          );
        })}
      </div>
      <ErrorCampo idCampo={id} mensaje={error} />
    </fieldset>
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
