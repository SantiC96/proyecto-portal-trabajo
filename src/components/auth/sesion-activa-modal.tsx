"use client";

import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { BotonFormulario } from "@/components/ui/boton-formulario";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BotonesDialogo, CLASE_ACCION_DIALOGO } from "@/components/ui/dialogo-confirmacion";
import type { Rol } from "@/types/db";

const ROL_LABEL: Record<string, string> = {
  postulante: "Postulante",
  empresa: "Empresa",
  municipalidad: "Oficina de Empleo",
};

function listarRoles(roles: Rol[]): string {
  const labels = roles.map((r) => ROL_LABEL[r]);
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} o ${labels[labels.length - 1]}`;
}

interface Props {
  nombre: string;
  rol: Rol | null;
  redirectTo: string;
  /** "otro-rol": la sesión es de un rol distinto al de la página pedida. */
  accion: "registro" | "login" | "otro-rol";
  /** Solo con "otro-rol": roles de la página pedida. */
  rolesDestino?: Rol[];
  profileHref?: string;
  onClose: () => void;
}

export function SesionActivaModal({
  nombre,
  rol,
  redirectTo,
  accion,
  rolesDestino = [],
  profileHref,
  onClose,
}: Props) {
  const rolLabel = (rol && ROL_LABEL[rol]) ?? "Postulante";
  const otroRol = accion === "otro-rol";
  const destinoLabel = listarRoles(rolesDestino);

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      {/* Más ancho que el común: las acciones tienen textos largos. */}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {otroRol ? "Este enlace es para otra cuenta" : "Ya tenés una sesión iniciada"}
          </DialogTitle>
          <DialogDescription>
            {otroRol
              ? `${destinoLabel ? `El enlace que abriste es para una cuenta de ${destinoLabel}.` : "El enlace que abriste es para otro tipo de cuenta."} Iniciaste sesión como ${nombre} con una cuenta de ${rolLabel}.`
              : accion === "login"
                ? `Estás conectado como ${nombre} (${rolLabel}). Si querés entrar con otra cuenta, primero tenés que cerrar la sesión actual.`
                : `Estás conectado como ${nombre} (${rolLabel}). Para crear una cuenta nueva, primero tenés que cerrar la sesión actual.`}
          </DialogDescription>
        </DialogHeader>

        <BotonesDialogo pendiente={false} onCancelar={onClose}>
          {accion !== "registro" && profileHref && (
            <Link href={profileHref} onClick={onClose} className={CLASE_ACCION_DIALOGO.secundario}>
              {otroRol ? "Ir a mi panel" : "Ir a mi perfil"}
            </Link>
          )}
          <form action={logout} className="flex flex-col">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <BotonFormulario
              textoPendiente="Cerrando sesión…"
              className={CLASE_ACCION_DIALOGO.primario}
            >
              {otroRol
                ? "Cerrar sesión e ingresar con otra cuenta"
                : accion === "login"
                  ? "Cerrar sesión y entrar con otra cuenta"
                  : "Cerrar sesión y registrarme"}
            </BotonFormulario>
          </form>
        </BotonesDialogo>
      </DialogContent>
    </Dialog>
  );
}
