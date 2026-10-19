"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, MapPin } from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { LARGO_MAXIMO, validarOferta, type OfertaData } from "@/lib/validaciones";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { crearOferta, editarOferta } from "@/app/empresa/(panel)/ofertas/actions";
import { type ErrorAccion, toErrorAccion } from "@/lib/resultado";
import { DURACIONES_OFERTA, DURACION_OFERTA_POR_DEFECTO } from "@/lib/ofertas-vencimiento";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import type { Tabla } from "@/types/db";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";

type Categoria = Pick<Tabla<"categorias">, "id" | "nombre">;

interface OfertaFormProps {
  categorias: Categoria[];
  ofertaId?: string;
  valorInicial?: Partial<OfertaData>;
  estaPublicada?: boolean;
  minimoVacantes?: number;
}

const MODALIDADES = ["Presencial", "Híbrido", "Remoto"] as const;
const JORNADAS = ["Tiempo completo", "Part-time", "Pasantía", "Por proyecto"] as const;

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

export function OfertaForm({ categorias, ofertaId, valorInicial, estaPublicada, minimoVacantes = 1 }: OfertaFormProps) {
  const router = useRouter();
  const { pendiente: isPending, ejecutar } = useAccion();
  const [error, setError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<keyof OfertaData>();
  const errorRef = useRef<HTMLDivElement>(null);
  // Una clave por formulario abierto: si el mismo envío llega dos veces, la
  // base crea una sola oferta (migration_040).
  const [claveEnvio] = useState(() => crypto.randomUUID());

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

  function agregarRequisito() {
    const val = nuevoRequisito.trim();
    if (!val || requisitos.length >= 15) return;
    setRequisitos([...requisitos, val]);
    setNuevoRequisito("");
  }

  function agregarBeneficio() {
    const val = nuevoBeneficio.trim();
    if (!val || beneficios.length >= 15) return;
    setBeneficios([...beneficios, val]);
    setNuevoBeneficio("");
  }

  function handleKeyDownRequisito(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarRequisito();
    }
  }

  function handleKeyDownBeneficio(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarBeneficio();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;

    // Auto-add any text written in the inputs but not yet added to the list.
    const reqFinal = [...requisitos];
    const reqPendiente = nuevoRequisito.trim();
    if (reqPendiente && !reqFinal.includes(reqPendiente) && reqFinal.length < 15) {
      reqFinal.push(reqPendiente);
      setRequisitos(reqFinal);
      setNuevoRequisito("");
    }

    const benFinal = [...beneficios];
    const benPendiente = nuevoBeneficio.trim();
    if (benPendiente && !benFinal.includes(benPendiente) && benFinal.length < 15) {
      benFinal.push(benPendiente);
      setBeneficios(benFinal);
      setNuevoBeneficio("");
    }

    const data: OfertaData = {
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

    const completos = campos.validar(
      { titulo, descripcion, categorias: categoriasSeleccionadas, modalidad, jornada, requisitos: reqFinal },
      form
    );
    if (!completos) return;

    const errorValidacion = validarOferta(data);
    if (errorValidacion) {
      campos.marcar(errorValidacion.campo, errorValidacion.mensaje, form);
      return;
    }

    ejecutar(async () => {
      const result = ofertaId
        ? await editarOferta(ofertaId, data)
        : await crearOferta(data, claveEnvio);

      if (!result.ok) {
        if (campos.tomarDelServidor(result, CAMPOS)) return;
        setError(toErrorAccion(result));
        setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        return;
      }
      router.push("/empresa/ofertas?aviso=enviada");
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {estaPublicada && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Al guardar los cambios, la oferta vuelve a revisión de la Oficina de Empleo.
        </div>
      )}

      {/* Título */}
      <div className="space-y-1.5">
        <label htmlFor="titulo" className="block text-sm font-semibold text-foreground">
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
          className={"w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " + CLASE_CONTROL_INVALIDO}
          {...ariaErrorCampo("titulo", campos.errores.titulo)}
        />
        <ErrorCampo idCampo="titulo" mensaje={campos.errores.titulo} />
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <label htmlFor="descripcion" className="block text-sm font-semibold text-foreground">
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
          rows={5}
          maxLength={LARGO_MAXIMO.descripcion}
          className={"w-full resize-y rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " + CLASE_CONTROL_INVALIDO}
          {...ariaErrorCampo("descripcion", campos.errores.descripcion)}
        />
        <ErrorCampo idCampo="descripcion" mensaje={campos.errores.descripcion} />
        <ContadorCaracteres actual={descripcion.length} maximo={LARGO_MAXIMO.descripcion} />
      </div>

      {/* Categorías */}
      <div className="space-y-1.5">
        <label htmlFor="categorias" className="block text-sm font-semibold text-foreground">
          Categorías <Obligatorio />
          <span className="ml-2 font-normal text-muted-foreground">(1 a 5)</span>
        </label>
        <MultiCombobox
          id="categorias"
          opciones={categorias}
          seleccionados={categoriasSeleccionadas}
          onChange={(ids) => {
            setCategoriasSeleccionadas(ids);
            campos.limpiar("categorias");
          }}
          placeholder="Buscá o elegí una categoría..."
          vacioTexto="No hay categorías que coincidan"
          ariaInput={ariaErrorCampo("categorias", campos.errores.categorias)}
        />
        <ErrorCampo idCampo="categorias" mensaje={campos.errores.categorias} />
      </div>

      {/* Ubicación, modalidad y jornada */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <p className="block text-sm font-semibold text-foreground">Ubicación</p>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-tinted px-3 py-2.5 text-sm text-muted-foreground-strong">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            Funes, Santa Fe
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="modalidad" className="block text-sm font-semibold text-foreground">
            Modalidad <Obligatorio />
          </label>
          <select
            id="modalidad"
            value={modalidad}
            onChange={(e) => {
              setModalidad(e.target.value);
              campos.limpiar("modalidad");
            }}
            className={"w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " + CLASE_CONTROL_INVALIDO}
            {...ariaErrorCampo("modalidad", campos.errores.modalidad)}
          >
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ErrorCampo idCampo="modalidad" mensaje={campos.errores.modalidad} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="jornada" className="block text-sm font-semibold text-foreground">
            Jornada <Obligatorio />
          </label>
          <select
            id="jornada"
            value={jornada}
            onChange={(e) => {
              setJornada(e.target.value);
              campos.limpiar("jornada");
            }}
            className={"w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " + CLASE_CONTROL_INVALIDO}
            {...ariaErrorCampo("jornada", campos.errores.jornada)}
          >
            {JORNADAS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <ErrorCampo idCampo="jornada" mensaje={campos.errores.jornada} />
        </div>
      </div>

      {/* Vacantes */}
      <div className="space-y-1.5">
        <label htmlFor="vacantes" className="block text-sm font-semibold text-foreground">
          Cantidad de personas a contratar <Obligatorio />
        </label>
        <input
          id="vacantes"
          type="number"
          min={minimoVacantes}
          value={cantidadVacantes}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) setCantidadVacantes(v);
            campos.limpiar("cantidadVacantes");
          }}
          className={"w-32 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " + CLASE_CONTROL_INVALIDO}
          {...ariaErrorCampo("vacantes", campos.errores.cantidadVacantes)}
        />
        <ErrorCampo idCampo="vacantes" mensaje={campos.errores.cantidadVacantes} />
        <p className="text-xs text-muted-foreground">No se muestra a los postulantes.</p>
        {minimoVacantes > 1 && (
          <p className="text-xs text-amber-700">
            Ya tenés {minimoVacantes} {minimoVacantes === 1 ? "candidato seleccionado" : "candidatos seleccionados"}. La cantidad no puede ser menor.
          </p>
        )}
      </div>

      {/* Duración de la publicación */}
      <div className="space-y-1.5">
        <label htmlFor="duracion" className="block text-sm font-semibold text-foreground">
          Duración de la publicación <Obligatorio />
        </label>
        <select
          id="duracion"
          value={duracionDias}
          onChange={(e) => {
            setDuracionDias(Number(e.target.value));
            campos.limpiar("duracionDias");
          }}
          className={"w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-48 " + CLASE_CONTROL_INVALIDO}
          {...ariaErrorCampo("duracion", campos.errores.duracionDias)}
        >
          {DURACIONES_OFERTA.map((d) => (
            <option key={d} value={d}>
              {d} días
            </option>
          ))}
        </select>
        <ErrorCampo idCampo="duracion" mensaje={campos.errores.duracionDias} />
        <p className="text-xs text-muted-foreground">
          Se cuenta desde que la Oficina de Empleo aprueba la oferta. Cuando vence, deja de
          verse en el portal y podés renovarla por el mismo plazo.
          {estaPublicada && " Cambiarla no modifica el vencimiento actual."}
        </p>
      </div>

      {/* Requisitos */}
      <div className="space-y-1.5">
        <label htmlFor="requisitos" className="block text-sm font-semibold text-foreground">
          Requisitos <Obligatorio />
          <span className="ml-2 font-normal text-muted-foreground">(hasta 15)</span>
        </label>
        {requisitos.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {requisitos.map((req, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-tinted px-3 py-2 text-sm"
              >
                <span className="flex-1 text-foreground">{req}</span>
                <button
                  type="button"
                  onClick={() => setRequisitos(requisitos.filter((_, j) => j !== i))}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-red-100 hover:text-red-600"
                  aria-label="Quitar requisito"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {requisitos.length < 15 && (
          <div className="flex gap-2">
            <input
              id="requisitos"
              type="text"
              value={nuevoRequisito}
              onChange={(e) => {
                setNuevoRequisito(e.target.value);
                campos.limpiar("requisitos");
              }}
              onKeyDown={handleKeyDownRequisito}
              placeholder="Ej: Secundario completo, experiencia en ventas…"
              maxLength={LARGO_MAXIMO.itemOferta}
              {...ariaErrorCampo("requisitos", campos.errores.requisitos)}
              className={"flex-1 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " + CLASE_CONTROL_INVALIDO}
            />
            <button
              type="button"
              onClick={agregarRequisito}
              disabled={!nuevoRequisito.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
              aria-label="Agregar requisito"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Escribí un requisito y tocá Agregar o presioná Enter. Podés cargar varios.
        </p>
        <ErrorCampo idCampo="requisitos" mensaje={campos.errores.requisitos} />
      </div>

      {/* Beneficios */}
      <div className="space-y-1.5">
        <label htmlFor="beneficios" className="block text-sm font-semibold text-foreground">
          Beneficios
          <span className="ml-2 font-normal text-muted-foreground">(opcional, hasta 15)</span>
        </label>
        {beneficios.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {beneficios.map((ben, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-tinted px-3 py-2 text-sm"
              >
                <span className="flex-1 text-foreground">{ben}</span>
                <button
                  type="button"
                  onClick={() => setBeneficios(beneficios.filter((_, j) => j !== i))}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-red-100 hover:text-red-600"
                  aria-label="Quitar beneficio"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {beneficios.length < 15 && (
          <div className="flex gap-2">
            <input
              id="beneficios"
              type="text"
              value={nuevoBeneficio}
              onChange={(e) => {
                setNuevoBeneficio(e.target.value);
                campos.limpiar("beneficios");
              }}
              onKeyDown={handleKeyDownBeneficio}
              placeholder="Ej: Obra social, flexibilidad horaria, comedor…"
              maxLength={LARGO_MAXIMO.itemOferta}
              {...ariaErrorCampo("beneficios", campos.errores.beneficios)}
              className={"flex-1 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " + CLASE_CONTROL_INVALIDO}
            />
            <button
              type="button"
              onClick={agregarBeneficio}
              disabled={!nuevoBeneficio.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
              aria-label="Agregar beneficio"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Escribí un beneficio y tocá Agregar o presioná Enter. Podés cargar varios.
        </p>
        <ErrorCampo idCampo="beneficios" mensaje={campos.errores.beneficios} />
      </div>

      {/* Error de validación junto al botón */}
      {error && (
        <div
          ref={errorRef}
          className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <p>{error.mensaje}</p>
          {error.ref && (
            <p className="text-xs text-gray-500">
              Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
            </p>
          )}
        </div>
      )}

      {/* Botones */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/empresa/ofertas")}
          disabled={isPending}
          className="btn-secundario inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          className="btn-primario min-h-11 justify-center px-5"
        >
          {isPending && <Spinner />}
          {isPending ? "Guardando…" : ofertaId ? "Guardar cambios" : "Enviar a revisión"}
        </button>
      </div>
    </form>
  );
}
