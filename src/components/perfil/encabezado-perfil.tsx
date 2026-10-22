"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Upload, X } from "lucide-react";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";
import { FotoPerfilModal } from "@/components/ui/foto-perfil-modal";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";
import { Spinner } from "@/components/ui/spinner";
import { quitarAvatar, subirAvatar } from "@/app/(dashboard)/perfil/actions";
import {
  AVATAR_ACCEPT,
  AVATAR_HELP_TEXT,
  AVATAR_MAX_SIZE,
  ERRORES_ARCHIVO,
  validarTipoAvatar,
} from "@/lib/archivos";
import type { ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { MensajeError, type AjusteAvatar, type FotoPerfil } from "@/components/perfil/piezas";

// La empresa usa la foto de perfil como logo: mismo archivo, mismas
// validaciones, otros textos.
const TEXTOS = {
  foto: {
    subir: "Subir foto",
    cambiar: "Cambiar foto",
    guardar: "Guardar foto",
    quitar: "Quitar foto",
    ver: "Ver y ajustar foto de perfil",
    alt: "Foto de perfil de",
    tituloQuitar: "¿Quitar tu foto de perfil?",
    descripcionQuitar:
      "Tu perfil va a mostrar tus iniciales en lugar de la foto. Podés subir otra cuando quieras.",
  },
  logo: {
    subir: "Subir logo",
    cambiar: "Cambiar logo",
    guardar: "Guardar logo",
    quitar: "Quitar logo",
    ver: "Ver y ajustar logo",
    alt: "Logo de",
    tituloQuitar: "¿Quitar el logo de la empresa?",
    descripcionQuitar:
      "El perfil va a mostrar las iniciales de la empresa en lugar del logo. Podés subir otro cuando quieras.",
  },
} as const;

const CLASE_BOTON =
  "btn-secundario inline-flex min-h-11 items-center gap-1.5 px-4 text-sm font-medium sm:min-h-9";

/**
 * Encabezado de "Mi perfil" de los tres roles: la foto (o el logo de la
 * empresa), el nombre que se muestra y, debajo, el rol (o la persona que
 * gestiona la cuenta de la empresa). Es el único lugar del perfil con la foto:
 * desde acá se sube, se cambia y se quita; al hacer clic en la foto se ve
 * ampliada y se ajusta su posición. Las acciones son las del perfil del
 * postulante, que aceptan los tres roles y validan el archivo en el servidor.
 */
export function EncabezadoPerfil({
  avatarActivo,
  titulo,
  subtitulo,
  iniciales,
  variante = "foto",
}: {
  avatarActivo: FotoPerfil | null;
  /** Nombre grande: la persona, o la empresa en su perfil. */
  titulo: string;
  /** Debajo, más chico: "Postulante", "Oficina de Empleo" o la persona que gestiona la empresa. */
  subtitulo: string;
  /** Se muestran en el avatar cuando no hay foto. */
  iniciales?: string;
  variante?: keyof typeof TEXTOS;
}) {
  const router = useRouter();
  const textos = TEXTOS[variante];

  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const { pendiente: guardando, ejecutar } = useAccion();
  // Solo errores de la validación del archivo en el navegador: los del servidor van en el toast.
  const [error, setError] = useState<ErrorAccion | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalModo, setModalModo] = useState<"ver" | "ajustar">("ver");
  const [ajusteActual, setAjusteActual] = useState<AjusteAvatar>(
    avatarActivo?.ajuste ?? { x: 50, y: 50, zoom: 1 }
  );
  // Abre el editor de ajuste cuando llega la foto nueva tras el refresh.
  const abrirEditorTrasRefresh = useRef(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (abrirEditorTrasRefresh.current && avatarActivo) {
      abrirEditorTrasRefresh.current = false;
      setAjusteActual({ x: 50, y: 50, zoom: 1 });
      setModalModo("ajustar");
      setModalAbierto(true);
    }
  }, [avatarActivo]);

  const seleccionar = (file: File) => {
    if (!validarTipoAvatar(file.type)) {
      setError({ mensaje: ERRORES_ARCHIVO.avatarTipo });
      return;
    }
    if (file.size > AVATAR_MAX_SIZE) {
      setError({ mensaje: ERRORES_ARCHIVO.avatarTamano });
      return;
    }
    setError(null);
    setArchivo(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const guardar = () => {
    if (!archivo) return;
    setError(null);
    const fd = new FormData();
    fd.append("avatar", archivo);
    ejecutar(async () => {
      const result = await subirAvatar(fd);
      mostrarAviso(result);
      if (!result.ok) return;
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setArchivo(null);
      abrirEditorTrasRefresh.current = true;
      router.refresh();
    });
  };

  const cancelar = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setArchivo(null);
    setError(null);
  };

  const abrirModal = (modo: "ver" | "ajustar") => {
    setModalModo(modo);
    setModalAbierto(true);
  };

  const nombreCompleto = titulo.trim();
  const src = preview ?? avatarActivo?.url ?? undefined;
  const tieneFoto = !!(avatarActivo || preview);
  const puedeVer = !!(avatarActivo?.url && !preview);
  const alt = nombreCompleto ? `${textos.alt} ${nombreCompleto}` : textos.ver;
  const avatar = (
    <AvatarAjustado
      src={src}
      alt={alt}
      ajuste={preview ? undefined : ajusteActual}
      iniciales={iniciales}
      size="lg"
    />
  );

  return (
    <div className="tarjeta px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <div className="shrink-0">
          {puedeVer ? (
            <button
              type="button"
              className="block cursor-zoom-in rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              aria-label={textos.ver}
              onClick={() => abrirModal("ver")}
            >
              {avatar}
            </button>
          ) : (
            avatar
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <p className="break-words text-xl font-bold tracking-tight text-foreground">
              {nombreCompleto || "Sin nombre"}
            </p>
            <p className="mt-0.5 break-words text-sm font-medium text-primary">{subtitulo}</p>
          </div>

          {preview ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Vista previa lista. Guardá los cambios o cancelá.
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={guardar}
                  disabled={guardando}
                  aria-busy={guardando}
                  className="btn-primario min-h-11 sm:min-h-9"
                >
                  {guardando ? <Spinner /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                  {guardando ? "Guardando…" : textos.guardar}
                </button>
                <button type="button" onClick={cancelar} disabled={guardando} className={CLASE_BOTON}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={guardando}
                className={CLASE_BOTON}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                {tieneFoto ? textos.cambiar : textos.subir}
              </button>
              {tieneFoto && (
                <DialogoConfirmacion
                  textoBoton={
                    <>
                      <X className="h-4 w-4" aria-hidden="true" />
                      {textos.quitar}
                    </>
                  }
                  estiloBoton="peligro"
                  claseBoton="sm:min-h-9"
                  deshabilitado={guardando}
                  titulo={textos.tituloQuitar}
                  descripcion={textos.descripcionQuitar}
                  textoConfirmar="Sí, quitar"
                  textoPendiente="Quitando…"
                  destructivo
                  accion={quitarAvatar}
                  onExito={() => router.refresh()}
                />
              )}
            </div>
          )}

          <p className="text-xs text-muted-icon">
            {AVATAR_HELP_TEXT} Los archivos eliminados se conservan 90 días por seguridad y
            luego se borran definitivamente.
          </p>
          {error && <MensajeError error={error} />}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) seleccionar(file);
          e.target.value = "";
        }}
      />

      {modalAbierto && avatarActivo?.url && (
        <FotoPerfilModal
          src={avatarActivo.url}
          nombre={nombreCompleto}
          ajusteInicial={ajusteActual}
          modoInicial={modalModo}
          onClose={() => setModalAbierto(false)}
          onGuardado={(nuevoAjuste) => {
            setAjusteActual(nuevoAjuste);
            setModalAbierto(false);
          }}
        />
      )}
    </div>
  );
}
