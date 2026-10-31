"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, IdCard, Mail, Pencil, Phone, User } from "lucide-react";
import { actualizarDatosContacto } from "@/app/(dashboard)/perfil/actions";
import { validarNombre, validarTelefono } from "@/lib/validaciones";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import {
  CLASE_CAMPO_CON_ICONO,
  CLASE_ERROR_PERFIL,
  CLASE_ETIQUETA_PERFIL,
  CampoLectura,
  FieldIcon,
  GrillaLectura,
  InputWrapper,
  SectionTitle,
  SeccionPerfil,
  inputClass,
  inputReadonlyClass,
} from "@/components/perfil/piezas";
import {
  BotonEditar,
  PieEdicion,
  useInformarCambios,
  useTarjetaEditable,
} from "@/components/perfil/tarjeta-editable";

type Campo = "nombre" | "apellido" | "telefono";
const CAMPOS: readonly Campo[] = ["nombre", "apellido", "telefono"];

/** Clases de los campos: las de siempre (oficina) o las de las tarjetas de Mi perfil. */
const CLASES = {
  simple: {
    etiqueta: "text-sm font-medium text-foreground",
    campo: inputClass,
    soloLectura: inputReadonlyClass,
    error: undefined,
    grilla: "grid grid-cols-1 gap-4 sm:grid-cols-2",
    nota: "text-muted-icon",
  },
  tarjeta: {
    etiqueta: CLASE_ETIQUETA_PERFIL,
    campo: CLASE_CAMPO_CON_ICONO,
    soloLectura: `${CLASE_CAMPO_CON_ICONO} cursor-default bg-surface-tinted text-muted-foreground-strong`,
    error: CLASE_ERROR_PERFIL,
    grilla: "grid grid-cols-1 gap-4 @md:grid-cols-2",
    nota: "text-muted-foreground",
  },
} as const;

/**
 * Datos de contacto de la persona (empresa y oficina). Al guardar, el
 * encabezado del perfil y el menú del usuario se actualizan con el refresh.
 * Con `variante="tarjeta"` (perfil de la empresa) es una tarjeta editable de
 * Mi perfil: IdCard, "Editar datos" y los datos en lectura en 2 columnas.
 * `titulo` cambia el de la tarjeta ("Datos personales" en la oficina).
 */
export function DatosContactoForm({
  datos,
  email,
  variante = "simple",
  titulo = "Datos de contacto",
}: {
  datos: { nombre: string; apellido: string; telefono: string };
  email: string;
  variante?: keyof typeof CLASES;
  titulo?: string;
}) {
  const router = useRouter();
  const conTarjeta = variante === "tarjeta";
  const clases = CLASES[variante];
  const tarjeta = useTarjetaEditable("datos-contacto", { titulo });
  const [editandoSimple, setEditandoSimple] = useState(false);
  const editando = conTarjeta ? tarjeta.editando : editandoSimple;
  const [nombre, setNombre] = useState(datos.nombre);
  const [apellido, setApellido] = useState(datos.apellido);
  const [telefono, setTelefono] = useState(datos.telefono);
  const { pendiente, ejecutar } = useAccion();
  const campos = useErroresCampo<Campo>();
  useInformarCambios(
    tarjeta,
    conTarjeta &&
      (nombre !== datos.nombre || apellido !== datos.apellido || telefono !== datos.telefono),
  );

  function cerrarEdicion() {
    if (conTarjeta) tarjeta.cerrar();
    else setEditandoSimple(false);
  }

  function cancelar() {
    setNombre(datos.nombre);
    setApellido(datos.apellido);
    setTelefono(datos.telefono);
    campos.limpiarTodos();
    cerrarEdicion();
  }

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!campos.validar({ nombre, apellido }, form)) return;
    const errores = [
      ["nombre", validarNombre(nombre)],
      ["apellido", validarNombre(apellido)],
      ["telefono", validarTelefono(telefono)],
    ] as const;
    const primero = errores.find(([, mensaje]) => mensaje);
    if (primero?.[1]) {
      campos.marcar(primero[0], primero[1], form);
      return;
    }
    ejecutar(async () => {
      const res = await actualizarDatosContacto({ nombre, apellido, telefono });
      if (!campos.tomarDelServidor(res, CAMPOS)) mostrarAviso(res);
      if (!res.ok) return;
      setNombre(nombre.trim());
      setApellido(apellido.trim());
      setTelefono(telefono.trim());
      cerrarEdicion();
      router.refresh();
    });
  }

  const camposEdicion = (
    <div className={clases.grilla}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-nombre" className={clases.etiqueta}>
          Nombre <Obligatorio />
        </label>
        <InputWrapper>
          <FieldIcon icon={User} />
          <input
            id="dc-nombre"
            type="text"
            autoComplete="given-name"
            required
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              campos.limpiar("nombre");
            }}
            placeholder="Ej: María"
            className={clases.campo}
            {...ariaErrorCampo("dc-nombre", campos.errores.nombre)}
          />
        </InputWrapper>
        <ErrorCampo idCampo="dc-nombre" mensaje={campos.errores.nombre} className={clases.error} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-apellido" className={clases.etiqueta}>
          Apellido <Obligatorio />
        </label>
        <InputWrapper>
          <FieldIcon icon={User} />
          <input
            id="dc-apellido"
            type="text"
            autoComplete="family-name"
            required
            value={apellido}
            onChange={(e) => {
              setApellido(e.target.value);
              campos.limpiar("apellido");
            }}
            placeholder="Ej: González"
            className={clases.campo}
            {...ariaErrorCampo("dc-apellido", campos.errores.apellido)}
          />
        </InputWrapper>
        <ErrorCampo idCampo="dc-apellido" mensaje={campos.errores.apellido} className={clases.error} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-telefono" className={clases.etiqueta}>
          Teléfono / Celular
        </label>
        <InputWrapper>
          <FieldIcon icon={Phone} />
          <input
            id="dc-telefono"
            type="tel"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => {
              setTelefono(e.target.value);
              campos.limpiar("telefono");
            }}
            placeholder="Ej: 341 5678901"
            className={clases.campo}
            {...ariaErrorCampo("dc-telefono", campos.errores.telefono)}
          />
        </InputWrapper>
        <ErrorCampo idCampo="dc-telefono" mensaje={campos.errores.telefono} className={clases.error} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-email" className={clases.etiqueta}>
          Email <span className={`ml-1 text-xs font-normal ${clases.nota}`}>(no editable)</span>
        </label>
        <InputWrapper>
          <FieldIcon icon={Mail} />
          <input
            id="dc-email"
            type="email"
            readOnly
            value={email}
            className={clases.soloLectura}
            tabIndex={-1}
          />
        </InputWrapper>
      </div>
    </div>
  );

  if (conTarjeta) {
    return (
      <SeccionPerfil
        id="datos-contacto"
        titulo={titulo}
        icono={IdCard}
        acciones={
          !editando && (
            <BotonEditar
              tarjeta={tarjeta}
              texto="Editar datos"
              etiqueta={`Editar ${titulo.toLowerCase()}`}
              className="btn-neutro btn-chico self-start text-primary hover:text-primary-hover sm:self-auto"
            />
          )
        }
      >
        {editando ? (
          <form
            id={tarjeta.idFormulario}
            onSubmit={guardar}
            noValidate
            className="@container flex flex-col gap-5"
          >
            {camposEdicion}
            <PieEdicion pendiente={pendiente} onCancelar={cancelar} textoGuardar="Guardar datos" />
          </form>
        ) : (
          <GrillaLectura>
            <CampoLectura estiloPerfil chipVacio={false} label="Nombre" valor={nombre} />
            <CampoLectura estiloPerfil chipVacio={false} label="Apellido" valor={apellido} />
            <CampoLectura estiloPerfil chipVacio={false} label="Teléfono / Celular" valor={telefono} />
            <CampoLectura estiloPerfil chipVacio={false} label="Email" valor={email} />
          </GrillaLectura>
        )}
      </SeccionPerfil>
    );
  }

  return (
    <form onSubmit={guardar} noValidate>
      <div className="tarjeta px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionTitle>Datos de contacto</SectionTitle>
          {!editando && (
            <button
              type="button"
              onClick={() => setEditandoSimple(true)}
              className="btn-secundario inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium sm:min-h-9"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar datos
            </button>
          )}
        </div>

        {!editando ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <CampoLectura label="Nombre" valor={nombre} />
            <CampoLectura label="Apellido" valor={apellido} />
            <CampoLectura label="Teléfono / Celular" valor={telefono} />
            <CampoLectura label="Email" valor={email} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {camposEdicion}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pendiente}
                aria-busy={pendiente}
                className="btn-primario min-h-11 justify-center px-6"
              >
                {pendiente ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                {pendiente ? "Guardando…" : "Guardar datos"}
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={pendiente}
                className="btn-secundario inline-flex min-h-11 items-center justify-center px-6 text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
