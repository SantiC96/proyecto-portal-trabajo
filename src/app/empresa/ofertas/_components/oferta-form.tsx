"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, MapPin } from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { validarOferta, type OfertaData } from "@/lib/validaciones";
import { crearOferta, editarOferta } from "@/app/empresa/ofertas/actions";

interface Categoria {
  id: string;
  nombre: string;
}

interface OfertaFormProps {
  categorias: Categoria[];
  ofertaId?: string;
  valorInicial?: Partial<OfertaData>;
  estaPublicada?: boolean;
}

const MODALIDADES = ["Presencial", "Híbrido", "Remoto"] as const;
const JORNADAS = ["Tiempo completo", "Part-time", "Pasantía", "Por proyecto"] as const;

export function OfertaForm({ categorias, ofertaId, valorInicial, estaPublicada }: OfertaFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

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

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);

    const data: OfertaData = {
      titulo,
      descripcion,
      categorias: categoriasSeleccionadas,
      modalidad,
      jornada,
      requisitos,
      beneficios,
    };

    const validationError = validarOferta(data);
    if (validationError) {
      setError(validationError);
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    startTransition(async () => {
      const result = ofertaId
        ? await editarOferta(ofertaId, data)
        : await crearOferta(data);

      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/empresa/ofertas?aviso=enviada");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {estaPublicada && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Al guardar los cambios, la oferta vuelve a revisión de la Oficina de Empleo.
        </div>
      )}

      {/* Título */}
      <div className="space-y-1.5">
        <label htmlFor="titulo" className="block text-sm font-semibold text-foreground">
          Título del puesto <span className="text-red-500">*</span>
        </label>
        <input
          id="titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Vendedor/a de salón"
          maxLength={120}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <label htmlFor="descripcion" className="block text-sm font-semibold text-foreground">
          Descripción del puesto <span className="text-red-500">*</span>
        </label>
        <textarea
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Describí las tareas, responsabilidades y el contexto del puesto..."
          rows={5}
          maxLength={4000}
          className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-xs text-muted-foreground">{descripcion.length}/4000</p>
      </div>

      {/* Categorías */}
      <div className="space-y-1.5">
        <label htmlFor="categorias" className="block text-sm font-semibold text-foreground">
          Categorías <span className="text-red-500">*</span>
          <span className="ml-2 font-normal text-muted-foreground">(1 a 5)</span>
        </label>
        <MultiCombobox
          id="categorias"
          opciones={categorias}
          seleccionados={categoriasSeleccionadas}
          onChange={setCategoriasSeleccionadas}
          placeholder="Buscá o elegí una categoría..."
          vacioTexto="No hay categorías que coincidan"
        />
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
            Modalidad <span className="text-red-500">*</span>
          </label>
          <select
            id="modalidad"
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="jornada" className="block text-sm font-semibold text-foreground">
            Jornada <span className="text-red-500">*</span>
          </label>
          <select
            id="jornada"
            value={jornada}
            onChange={(e) => setJornada(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {JORNADAS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requisitos */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          Requisitos
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
              type="text"
              value={nuevoRequisito}
              onChange={(e) => setNuevoRequisito(e.target.value)}
              onKeyDown={handleKeyDownRequisito}
              placeholder="Escribí un requisito y presioná Enter o +"
              maxLength={200}
              className="flex-1 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
      </div>

      {/* Beneficios */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          Beneficios
          <span className="ml-2 font-normal text-muted-foreground">(hasta 15)</span>
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
              type="text"
              value={nuevoBeneficio}
              onChange={(e) => setNuevoBeneficio(e.target.value)}
              onKeyDown={handleKeyDownBeneficio}
              placeholder="Escribí un beneficio y presioná Enter o +"
              maxLength={200}
              className="flex-1 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
      </div>

      {/* Error de validación junto al botón */}
      {error && (
        <div
          ref={errorRef}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Botones */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/empresa/ofertas")}
          disabled={isPending}
          className="btn-secundario inline-flex h-10 items-center justify-center px-5 text-sm font-medium disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isPending ? "Guardando…" : ofertaId ? "Guardar cambios" : "Enviar a revisión"}
        </button>
      </div>
    </form>
  );
}
