"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, Pencil, Phone, User } from "lucide-react";
import { actualizarDatosContacto } from "@/app/(dashboard)/perfil/actions";
import { validarNombre, validarTelefono } from "@/lib/validaciones";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import {
  CampoLectura,
  FieldIcon,
  InputWrapper,
  SectionTitle,
  inputClass,
  inputReadonlyClass,
} from "@/components/perfil/piezas";

type Campo = "nombre" | "apellido" | "telefono";
const CAMPOS: readonly Campo[] = ["nombre", "apellido", "telefono"];

/**
 * Datos de contacto de la persona (empresa y oficina). Al guardar, el
 * encabezado del perfil y el menú del usuario se actualizan con el refresh.
 */
export function DatosContactoForm({
  datos,
  email,
}: {
  datos: { nombre: string; apellido: string; telefono: string };
  email: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(datos.nombre);
  const [apellido, setApellido] = useState(datos.apellido);
  const [telefono, setTelefono] = useState(datos.telefono);
  const { pendiente, ejecutar } = useAccion();
  const campos = useErroresCampo<Campo>();

  function cancelar() {
    setNombre(datos.nombre);
    setApellido(datos.apellido);
    setTelefono(datos.telefono);
    campos.limpiarTodos();
    setEditando(false);
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
      setEditando(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={guardar} noValidate>
      <div className="rounded-2xl border border-border bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionTitle>Datos de contacto</SectionTitle>
          {!editando && (
            <button
              type="button"
              onClick={() => setEditando(true)}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dc-nombre" className="text-sm font-medium text-foreground">
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
                    className={inputClass}
                    {...ariaErrorCampo("dc-nombre", campos.errores.nombre)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="dc-nombre" mensaje={campos.errores.nombre} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dc-apellido" className="text-sm font-medium text-foreground">
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
                    className={inputClass}
                    {...ariaErrorCampo("dc-apellido", campos.errores.apellido)}
                  />
                </InputWrapper>
                <ErrorCampo idCampo="dc-apellido" mensaje={campos.errores.apellido} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dc-telefono" className="text-sm font-medium text-foreground">
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
                  className={inputClass}
                  {...ariaErrorCampo("dc-telefono", campos.errores.telefono)}
                />
              </InputWrapper>
              <ErrorCampo idCampo="dc-telefono" mensaje={campos.errores.telefono} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dc-email" className="text-sm font-medium text-foreground">
                Email <span className="ml-1 text-xs font-normal text-muted-icon">(no editable)</span>
              </label>
              <InputWrapper>
                <FieldIcon icon={Mail} />
                <input
                  id="dc-email"
                  type="email"
                  readOnly
                  value={email}
                  className={inputReadonlyClass}
                  tabIndex={-1}
                />
              </InputWrapper>
            </div>

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
