"use client";

import { CampoFechaHora, diaYHoraFuturos, fechaHoraISO, horarioYaPaso } from "@/components/ui/campo-fecha-hora";
import { OpcionRadio } from "@/components/ui/opcion-radio";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import {
  AYUDA_LINK_REUNION,
  MODALIDAD_LABEL,
  MODALIDADES_ENTREVISTA,
  modalidadDe,
  validarLinkReunion,
  type CampoEntrevista,
  type ModalidadEntrevista,
} from "@/lib/entrevistas";
import { LARGO_MAXIMO } from "@/lib/validaciones";

export type ValoresEntrevista = {
  dia: Date | undefined;
  hora: string;
  modalidad: ModalidadEntrevista;
  lugar: string;
  link: string;
};

/** Valores del formulario: vacío para coordinar, o los actuales para reprogramar. */
export function valoresEntrevista(actual?: {
  fechaHora: string | null;
  modalidad: string | null;
  lugar: string | null;
  link: string | null;
}): ValoresEntrevista {
  const fecha = diaYHoraFuturos(actual?.fechaHora);
  return {
    dia: fecha?.dia,
    hora: fecha?.hora ?? "",
    modalidad: modalidadDe(actual?.modalidad),
    lugar: actual?.lugar ?? "",
    link: actual?.link ?? "",
  };
}

type Errores = {
  validar: (obligatorios: Partial<Record<CampoEntrevista, unknown>>, raiz?: HTMLElement | null) => boolean;
  marcar: (campo: CampoEntrevista, mensaje: string, raiz?: HTMLElement | null) => void;
};

/**
 * Validación en el navegador antes de llamar a la acción (el servidor la
 * repite): fecha y hora completas y futuras, y el lugar (presencial) o el
 * link (online). Devuelve la fecha en ISO, o null si marcó un error.
 */
export function validarEntrevistaEnCliente(
  valores: ValoresEntrevista,
  campos: Errores,
  form: HTMLFormElement,
): string | null {
  const fechaCompleta = valores.dia && valores.hora ? "ok" : "";
  const obligatorios =
    valores.modalidad === "presencial"
      ? { fechaHora: fechaCompleta, lugar: valores.lugar }
      : { fechaHora: fechaCompleta, link: valores.link };
  if (!campos.validar(obligatorios, form) || !valores.dia) return null;

  if (horarioYaPaso(valores.dia, valores.hora)) {
    campos.marcar("fechaHora", "El horario elegido ya pasó. Elegí uno posterior.", form);
    return null;
  }
  if (valores.modalidad === "online") {
    const errLink = validarLinkReunion(valores.link);
    if (errLink) {
      campos.marcar("link", errLink, form);
      return null;
    }
  }
  return fechaHoraISO(valores.dia, valores.hora);
}

type Props = {
  idBase: string;
  valores: ValoresEntrevista;
  onCambiar: (cambio: Partial<ValoresEntrevista>) => void;
  errores: Partial<Record<CampoEntrevista, string>>;
  onLimpiar: (campo: CampoEntrevista) => void;
  deshabilitado?: boolean;
  placeholderLugar?: string;
};

/**
 * Fecha y hora, modalidad (Presencial / Online) y, según la modalidad, el
 * lugar o el link de la reunión. Los usan la pre-entrevista de la oficina y la
 * entrevista de la empresa.
 */
export function CamposEntrevista({
  idBase,
  valores,
  onCambiar,
  errores,
  onLimpiar,
  deshabilitado = false,
  placeholderLugar = "Dirección, piso u oficina",
}: Props) {
  const idFecha = `${idBase}-fecha`;
  const idLugar = `${idBase}-lugar`;
  const idLink = `${idBase}-link`;
  const idAyudaLink = `${idLink}-ayuda`;
  const ariaLink = ariaErrorCampo(idLink, errores.link);

  return (
    <>
      <CampoFechaHora
        id={idFecha}
        dia={valores.dia}
        hora={valores.hora}
        onDiaChange={(dia) => {
          onCambiar({ dia });
          onLimpiar("fechaHora");
        }}
        onHoraChange={(hora) => {
          onCambiar({ hora });
          onLimpiar("fechaHora");
        }}
        deshabilitado={deshabilitado}
        error={errores.fechaHora}
      />

      <fieldset disabled={deshabilitado} className="flex min-w-0 flex-col gap-1.5">
        <legend className="etiqueta-campo mb-1.5">
          Modalidad <Obligatorio />
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {MODALIDADES_ENTREVISTA.map((modalidad) => (
            <OpcionRadio
              key={modalidad}
              name={`${idBase}-modalidad`}
              value={modalidad}
              checked={valores.modalidad === modalidad}
              onChange={() => {
                onCambiar({ modalidad });
                onLimpiar("modalidad");
                onLimpiar("lugar");
                onLimpiar("link");
              }}
            >
              <span className="text-[15px] font-semibold text-heading">{MODALIDAD_LABEL[modalidad]}</span>
            </OpcionRadio>
          ))}
        </div>
        <ErrorCampo idCampo={`${idBase}-modalidad`} mensaje={errores.modalidad} />
      </fieldset>

      {valores.modalidad === "presencial" ? (
        <div>
          <label htmlFor={idLugar} className="etiqueta-campo mb-1.5 block">
            Lugar <Obligatorio />
          </label>
          <input
            id={idLugar}
            type="text"
            value={valores.lugar}
            onChange={(e) => {
              onCambiar({ lugar: e.target.value });
              onLimpiar("lugar");
            }}
            placeholder={placeholderLugar}
            maxLength={LARGO_MAXIMO.lugarEntrevista}
            disabled={deshabilitado}
            autoComplete="off"
            className="campo"
            {...ariaErrorCampo(idLugar, errores.lugar)}
          />
          <ErrorCampo idCampo={idLugar} mensaje={errores.lugar} className="mt-1.5" />
        </div>
      ) : (
        <div>
          <label htmlFor={idLink} className="etiqueta-campo mb-1.5 block">
            Link de la reunión <Obligatorio />
          </label>
          <input
            id={idLink}
            type="url"
            inputMode="url"
            value={valores.link}
            onChange={(e) => {
              onCambiar({ link: e.target.value });
              onLimpiar("link");
            }}
            placeholder="https://meet.google.com/…"
            maxLength={LARGO_MAXIMO.linkReunion}
            disabled={deshabilitado}
            autoComplete="off"
            spellCheck={false}
            className="campo"
            aria-invalid={ariaLink["aria-invalid"]}
            aria-describedby={[idAyudaLink, ariaLink["aria-describedby"]].filter(Boolean).join(" ")}
          />
          <p id={idAyudaLink} className="mt-1.5 text-[13px] text-muted-foreground">
            {AYUDA_LINK_REUNION}
          </p>
          <ErrorCampo idCampo={idLink} mensaje={errores.link} className="mt-1.5" />
        </div>
      )}
    </>
  );
}
