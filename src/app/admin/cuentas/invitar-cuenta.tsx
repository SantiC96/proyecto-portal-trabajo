"use client";

import { useState } from "react";
import { Send, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo, CLASE_ACCION_DIALOGO } from "@/components/ui/dialogo-confirmacion";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { validarEmail, validarNombre, validarTelefono } from "@/lib/validaciones";
import { invitarCuenta } from "./actions";

type Campo = "nombre" | "apellido" | "telefono" | "email";
// En el orden del formulario: el primer error que se marca es el de más arriba.
const CAMPOS: readonly Campo[] = ["nombre", "apellido", "email", "telefono"];
const VACIO: Record<Campo, string> = { nombre: "", apellido: "", telefono: "", email: "" };

const ETIQUETAS: Record<Campo, { label: string; tipo: string; autoComplete: string; obligatorio: boolean; placeholder: string }> = {
  nombre: { label: "Nombre", tipo: "text", autoComplete: "off", obligatorio: true, placeholder: "Ej: María" },
  apellido: { label: "Apellido", tipo: "text", autoComplete: "off", obligatorio: true, placeholder: "Ej: González" },
  telefono: { label: "Teléfono", tipo: "tel", autoComplete: "off", obligatorio: false, placeholder: "Ej: 341 5678901" },
  email: { label: "Email", tipo: "email", autoComplete: "off", obligatorio: true, placeholder: "nombre@funes.gob.ar" },
};

/**
 * Invitar una cuenta de la oficina: la persona recibe un email de Supabase
 * Auth con un link para elegir su contraseña (/auth/aceptar-invitacion).
 */
export function InvitarCuenta() {
  const [abierto, setAbierto] = useState(false);
  const [valores, setValores] = useState(VACIO);
  const campos = useErroresCampo<Campo>();
  const { pendiente, ejecutar } = useAccion();

  function cambiarAbierto(v: boolean) {
    if (pendiente) return;
    setAbierto(v);
    if (!v) {
      setValores(VACIO);
      campos.limpiarTodos();
    }
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { nombre, apellido, telefono, email } = valores;
    if (!campos.validar({ nombre, apellido, email }, form)) return;
    const errores = [
      ["nombre", validarNombre(nombre)],
      ["apellido", validarNombre(apellido)],
      ["email", validarEmail(email)],
      ["telefono", validarTelefono(telefono)],
    ] as const;
    const primero = errores.find(([, mensaje]) => mensaje);
    if (primero?.[1]) {
      campos.marcar(primero[0], primero[1], form);
      return;
    }
    ejecutar(async () => {
      const res = await invitarCuenta(valores);
      if (!campos.tomarDelServidor(res, CAMPOS)) mostrarAviso(res);
      if (!res.ok) return;
      setAbierto(false);
      setValores(VACIO);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn-primario min-h-11 justify-center px-4"
      >
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Invitar cuenta
      </button>

      <Dialog open={abierto} onOpenChange={cambiarAbierto}>
        <DialogContent>
          <DialogHeader icono={UserPlus} tonoIcono="primario">
            <DialogTitle>Invitar una cuenta de la oficina</DialogTitle>
            <DialogDescription>
              La persona recibe un email para elegir su contraseña. Va a tener los mismos
              permisos que el resto de las cuentas de la oficina.
            </DialogDescription>
          </DialogHeader>

          {/* Nombre y Apellido lado a lado desde sm; Email y Teléfono a todo el ancho. */}
          <form
            id="form-invitar-cuenta"
            onSubmit={enviar}
            noValidate
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {CAMPOS.map((campo) => {
              const cfg = ETIQUETAS[campo];
              const id = `invitar-${campo}`;
              const ancho = campo === "email" || campo === "telefono";
              return (
                <div key={campo} className={ancho ? "flex flex-col gap-1.5 sm:col-span-2" : "flex flex-col gap-1.5"}>
                  <label htmlFor={id} className="etiqueta-campo">
                    {cfg.label}{" "}
                    {cfg.obligatorio ? (
                      <Obligatorio />
                    ) : (
                      <span className="font-normal text-muted-foreground">(opcional)</span>
                    )}
                  </label>
                  <Input
                    id={id}
                    type={cfg.tipo}
                    autoComplete={cfg.autoComplete}
                    required={cfg.obligatorio}
                    value={valores[campo]}
                    placeholder={cfg.placeholder}
                    disabled={pendiente}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setValores((v) => ({ ...v, [campo]: valor }));
                      campos.limpiar(campo);
                    }}
                    className="min-h-11"
                    {...ariaErrorCampo(id, campos.errores[campo])}
                  />
                  <ErrorCampo idCampo={id} mensaje={campos.errores[campo]} />
                </div>
              );
            })}
          </form>

          <BotonesDialogo pendiente={pendiente} onCancelar={() => cambiarAbierto(false)}>
            <button
              type="submit"
              form="form-invitar-cuenta"
              disabled={pendiente}
              aria-busy={pendiente}
              className={CLASE_ACCION_DIALOGO.primario}
            >
              {pendiente ? <Spinner /> : <Send aria-hidden="true" />}
              {pendiente ? "Enviando…" : "Enviar invitación"}
            </button>
          </BotonesDialogo>
        </DialogContent>
      </Dialog>
    </>
  );
}
