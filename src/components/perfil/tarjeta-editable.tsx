"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo } from "@/components/ui/dialogo-confirmacion";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { PieSeccion } from "@/components/perfil/piezas";

// Tarjetas de "Mi perfil" que se ven en modo lectura y se editan con un botón.
// Dentro de <EdicionPerfil> hay una sola tarjeta en edición a la vez; fuera,
// cada tarjeta se abre y se cierra sola.

type DatosTarjeta = { titulo: string; incompleta: boolean };

type ContextoEdicion = {
  abierta: string | null;
  pedirEditar: (id: string) => void;
  cerrar: (id: string) => void;
  informarCambios: (id: string, hay: boolean) => void;
  registrar: (id: string, datos: DatosTarjeta) => () => void;
};

const Contexto = createContext<ContextoEdicion | null>(null);

/**
 * Coordina las tarjetas editables de una página: abrir una cierra la que
 * estaba en edición y, si tenía cambios sin guardar, primero lo pregunta.
 * Si la URL apunta (#id) a una tarjeta con datos obligatorios sin completar,
 * la abre en edición: así llegan los links "Completar" del panel
 * (hrefSeccionPerfil) y los del aviso de la página.
 */
export function EdicionPerfil({ children }: { children: ReactNode }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  // La tarjeta que se quiere abrir y el título de la que tiene cambios.
  const [pedida, setPedida] = useState<{ id: string; tituloAbierta: string } | null>(null);
  const tarjetas = useRef(new Map<string, DatosTarjeta>());
  // Se consulta solo al cambiar de tarjeta: no hace falta volver a renderizar.
  const conCambios = useRef(false);
  // La abierta, para el listener del ancla (que se registra una sola vez).
  const abiertaActual = useRef<string | null>(null);
  useEffect(() => {
    abiertaActual.current = abierta;
  }, [abierta]);

  const abrir = useCallback((id: string) => {
    conCambios.current = false;
    setPedida(null);
    setAbierta(id);
  }, []);

  const pedirEditar = useCallback(
    (id: string) => {
      const actual = abiertaActual.current;
      if (actual === id) return;
      if (actual !== null && conCambios.current) {
        setPedida({ id, tituloAbierta: tarjetas.current.get(actual)?.titulo ?? "" });
      } else abrir(id);
    },
    [abrir],
  );

  const cerrar = useCallback((id: string) => {
    if (abiertaActual.current === id) conCambios.current = false;
    setAbierta((actual) => (actual === id ? null : actual));
  }, []);

  const informarCambios = useCallback(
    (id: string, hay: boolean) => {
      if (abierta === id) conCambios.current = hay;
    },
    [abierta],
  );

  const registrar = useCallback((id: string, datos: DatosTarjeta) => {
    tarjetas.current.set(id, datos);
    return () => {
      tarjetas.current.delete(id);
    };
  }, []);

  useEffect(() => {
    function abrirDesdeAncla() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (tarjetas.current.get(id)?.incompleta) pedirEditar(id);
    }
    // Después de que las tarjetas se registren (sus efectos corren antes).
    const cuadro = requestAnimationFrame(abrirDesdeAncla);
    window.addEventListener("hashchange", abrirDesdeAncla);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener("hashchange", abrirDesdeAncla);
    };
  }, [pedirEditar]);

  const valor = useMemo(
    () => ({ abierta, pedirEditar, cerrar, informarCambios, registrar }),
    [abierta, pedirEditar, cerrar, informarCambios, registrar],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <DialogoDescartarCambios
        abierto={pedida !== null}
        titulo={pedida?.tituloAbierta ?? ""}
        onSeguirEditando={() => setPedida(null)}
        onDescartar={() => pedida !== null && abrir(pedida.id)}
      />
    </Contexto.Provider>
  );
}

/** "¿Descartar los cambios sin guardar?" de una tarjeta en edición. */
export function DialogoDescartarCambios({
  abierto,
  titulo,
  onSeguirEditando,
  onDescartar,
}: {
  abierto: boolean;
  /** Título de la tarjeta con cambios. */
  titulo: string;
  onSeguirEditando: () => void;
  onDescartar: () => void;
}) {
  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (!v) onSeguirEditando();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Descartar los cambios sin guardar?</DialogTitle>
          <DialogDescription>
            Tenés cambios sin guardar en «{titulo}». Si seguís, se pierden.
          </DialogDescription>
        </DialogHeader>
        <BotonesDialogo
          pendiente={false}
          onCancelar={onSeguirEditando}
          textoCancelar="Seguir editando"
          onConfirmar={onDescartar}
          textoConfirmar="Descartar cambios"
          destructivo
        />
      </DialogContent>
    </Dialog>
  );
}

export type TarjetaEditable = {
  editando: boolean;
  /** id del botón "Editar": el foco vuelve acá al guardar o cancelar. */
  idBoton: string;
  /** id del formulario en edición: el foco va a su primer campo al abrir. */
  idFormulario: string;
  abrir: () => void;
  /** Vuelve al modo lectura y lleva el foco al botón que abrió la edición. */
  cerrar: () => void;
  /** Lo llama el formulario en edición cada vez que cambia si hay cambios sin guardar. */
  informarCambios: (hay: boolean) => void;
};

function enfocarPrimerCampo(idFormulario: string) {
  document
    .getElementById(idFormulario)
    ?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([readonly]):not(:disabled), textarea:not(:disabled), button:not(:disabled)',
    )
    ?.focus();
}

/**
 * Estado de una tarjeta editable. `titulo` va en la pregunta de cambios sin
 * guardar; `incompleta` permite abrirla desde un link a su ancla.
 */
export function useTarjetaEditable(
  id: string,
  { titulo, incompleta = false }: { titulo: string; incompleta?: boolean },
): TarjetaEditable {
  const ctx = useContext(Contexto);
  const [abiertaSola, setAbiertaSola] = useState(false);
  const editando = ctx ? ctx.abierta === id : abiertaSola;

  const idBoton = `${id}-editar`;
  const idFormulario = `${id}-formulario`;
  const devolverFoco = useRef(false);
  const estabaEditando = useRef(editando);

  const registrar = ctx?.registrar;
  useEffect(() => registrar?.(id, { titulo, incompleta }), [registrar, id, titulo, incompleta]);

  useEffect(() => {
    if (editando && !estabaEditando.current) enfocarPrimerCampo(idFormulario);
    if (!editando && estabaEditando.current && devolverFoco.current) {
      document.getElementById(idBoton)?.focus();
    }
    devolverFoco.current = false;
    estabaEditando.current = editando;
  }, [editando, idBoton, idFormulario]);

  const pedirEditar = ctx?.pedirEditar;
  const cerrarCtx = ctx?.cerrar;
  const informar = ctx?.informarCambios;

  const abrir = useCallback(() => {
    if (pedirEditar) pedirEditar(id);
    else setAbiertaSola(true);
  }, [pedirEditar, id]);

  const cerrar = useCallback(() => {
    devolverFoco.current = true;
    if (cerrarCtx) cerrarCtx(id);
    else setAbiertaSola(false);
  }, [cerrarCtx, id]);

  const informarCambios = useCallback((hay: boolean) => informar?.(id, hay), [informar, id]);

  return { editando, idBoton, idFormulario, abrir, cerrar, informarCambios };
}

/** Avisa a la página si el formulario tiene cambios sin guardar. */
export function useInformarCambios(tarjeta: TarjetaEditable, hay: boolean) {
  const { informarCambios } = tarjeta;
  useEffect(() => {
    informarCambios(hay);
  }, [informarCambios, hay]);
}

/** Botón del encabezado de la tarjeta que la abre en edición (neutro y chico, con lápiz). */
export function BotonEditar({
  tarjeta,
  etiqueta,
  texto = "Editar",
  icono: Icono = Pencil,
  className = "btn-neutro btn-chico self-start sm:self-auto",
}: {
  tarjeta: TarjetaEditable;
  /** Nombre accesible: empieza con el texto visible ("Editar datos personales"). */
  etiqueta?: string;
  texto?: string;
  icono?: React.ElementType;
  className?: string;
}) {
  return (
    <button
      id={tarjeta.idBoton}
      type="button"
      onClick={tarjeta.abrir}
      aria-label={etiqueta}
      className={cn(className, "shrink-0")}
    >
      <Icono aria-hidden="true" />
      {texto}
    </button>
  );
}

/** Pie de una tarjeta en edición: "Cancelar" (neutro) y "Guardar cambios" (primario). */
export function PieEdicion({
  pendiente,
  onCancelar,
  textoGuardar = "Guardar cambios",
}: {
  pendiente: boolean;
  onCancelar: () => void;
  textoGuardar?: string;
}) {
  return (
    <PieSeccion>
      <button type="button" onClick={onCancelar} disabled={pendiente} className="btn-neutro">
        Cancelar
      </button>
      <button type="submit" disabled={pendiente} aria-busy={pendiente} className="btn-primario">
        {pendiente && <Spinner />}
        {pendiente ? "Guardando…" : textoGuardar}
      </button>
    </PieSeccion>
  );
}
