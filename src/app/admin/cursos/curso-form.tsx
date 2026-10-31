"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, PlayCircle } from "lucide-react";
import { crearCurso, editarCurso } from "./actions";
import { toErrorAccion, type ErrorAccion } from "@/lib/resultado";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { marcarNavegacionDelUsuario } from "@/lib/navegacion-interna";
import { formatFechaCorta } from "@/lib/fechas";
import { UMBRAL_RECHAZOS_CURSO, VENTANA_RECHAZOS_DIAS } from "@/lib/cursos";
import { Spinner } from "@/components/ui/spinner";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { DetalleConLateral } from "@/components/ui/detalle-con-lateral";
import { IconoCuadro } from "@/components/ui/icono-cuadro";
import { EstadoCursoBadge } from "@/components/cursos/estado-curso-badge";
import { BotonIrAlCurso, TarjetaCurso } from "@/components/cursos/tarjeta-curso";
import { LARGO_MAXIMO } from "@/lib/validaciones";
import type { Tabla } from "@/types/db";
import { ErrorCampo, Obligatorio, ariaErrorCampo, idErrorCampo } from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { CampoLectura } from "@/components/perfil/piezas";
import {
  BotonEditar,
  DialogoDescartarCambios,
  useTarjetaEditable,
} from "@/components/perfil/tarjeta-editable";

type CursoData = Pick<Tabla<"cursos">, "nombre" | "descripcion" | "link" | "indicaciones">;

const CAMPOS = ["nombre", "descripcion", "link", "indicaciones"] as const;

const ID_AYUDA_LINK = "cf-link-ayuda";

// Cómo funciona hoy el circuito de un curso (regla de migration_046: la
// oficina solo puede asignarlo a quien llegó al umbral de rechazos).
const PASOS_CIRCUITO = [
  "Creás el curso con su link y las indicaciones para inscribirse.",
  `Lo asignás desde la ficha de un postulante con ${UMBRAL_RECHAZOS_CURSO} o más rechazos de empresas en los últimos ${VENTANA_RECHAZOS_DIAS} días.`,
  "El postulante lo ve en Mis cursos, lo empieza y lo marca como completado. Te llega un aviso.",
];

type Props = {
  modo: "crear" | "editar";
  cursoId?: string;
  inicial?: CursoData;
};

/**
 * Formulario del curso. Al crear arma la pantalla entera: "Datos del curso"
 * a la izquierda y la vista previa con "Cómo se usa" a la derecha (desde xl,
 * dos columnas de la misma altura, como el formulario de oferta), con los
 * botones abajo. Al editar es solo la tarjeta "Datos del curso", a todo el
 * ancho debajo de "Estado" y "Asignaciones": en lectura, con el botón
 * "Editar"; en edición, los campos con "Cancelar" y "Guardar cambios". En los
 * dos, nombre y link en una fila y descripción e indicaciones en otra.
 * Cancelar con cambios sin guardar pide confirmación.
 */
export function CursoForm({ modo, cursoId, inicial }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [link, setLink] = useState(inicial?.link ?? "");
  const [indicaciones, setIndicaciones] = useState(inicial?.indicaciones ?? "");
  const [error, setError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<keyof CursoData>();
  const { pendiente: isPending, ejecutar } = useAccion();
  const crear = modo === "crear";
  // Al editar: los datos guardados (los del modo lectura) y la edición abierta.
  const [guardado, setGuardado] = useState<CursoData>({
    nombre: inicial?.nombre ?? "",
    descripcion: inicial?.descripcion ?? null,
    link: inicial?.link ?? null,
    indicaciones: inicial?.indicaciones ?? null,
  });
  const tarjeta = useTarjetaEditable("datos-curso", { titulo: "Datos del curso" });
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const hayCambios =
    nombre !== guardado.nombre ||
    link !== (guardado.link ?? "") ||
    descripcion !== (guardado.descripcion ?? "") ||
    indicaciones !== (guardado.indicaciones ?? "");

  function descartarCambios() {
    setNombre(guardado.nombre);
    setLink(guardado.link ?? "");
    setDescripcion(guardado.descripcion ?? "");
    setIndicaciones(guardado.indicaciones ?? "");
    setError(null);
    campos.limpiarTodos();
    tarjeta.cerrar();
  }

  function pedirCancelar() {
    if (hayCambios) setConfirmarDescarte(true);
    else descartarCambios();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!campos.validar({ nombre }, e.currentTarget)) return;
    if (link.trim() && !link.trim().startsWith("https://")) {
      campos.marcar("link", "El link debe comenzar con https://", e.currentTarget);
      return;
    }

    const data: CursoData = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      link: link.trim() || null,
      indicaciones: indicaciones.trim() || null,
    };

    ejecutar(async () => {
      const res = crear ? await crearCurso(data) : await editarCurso(cursoId!, data);
      if (!res.ok) {
        if (!campos.tomarDelServidor(res, CAMPOS)) setError(toErrorAccion(res));
      } else {
        mostrarAviso(res);
        if (!crear) {
          setNombre(data.nombre);
          setLink(data.link ?? "");
          setDescripcion(data.descripcion ?? "");
          setIndicaciones(data.indicaciones ?? "");
          setGuardado(data);
          tarjeta.cerrar();
        }
      }
    });
  }

  const camposCurso = (
    <div className="@container flex flex-col gap-5 xl:flex-1">
      <div className="grid grid-cols-1 items-start gap-5 @xl:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cf-nombre" className="etiqueta-campo">
            Nombre <Obligatorio />
          </label>
          <input
            id="cf-nombre"
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              campos.limpiar("nombre");
            }}
            placeholder="Ej: Preparación para entrevistas"
            maxLength={LARGO_MAXIMO.nombreCurso}
            className="campo"
            disabled={isPending}
            {...ariaErrorCampo("cf-nombre", campos.errores.nombre)}
          />
          <ErrorCampo idCampo="cf-nombre" mensaje={campos.errores.nombre} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cf-link" className="etiqueta-campo">
            Link <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="cf-link"
            type="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              campos.limpiar("link");
            }}
            placeholder="https://..."
            maxLength={LARGO_MAXIMO.linkCurso}
            className="campo"
            disabled={isPending}
            aria-invalid={campos.errores.link ? true : undefined}
            aria-describedby={
              campos.errores.link ? `${ID_AYUDA_LINK} ${idErrorCampo("cf-link")}` : ID_AYUDA_LINK
            }
          />
          <p id={ID_AYUDA_LINK} className="text-[13px] text-muted-foreground">
            Debe comenzar con https://
          </p>
          <ErrorCampo idCampo="cf-link" mensaje={campos.errores.link} />
        </div>
      </div>

      <div
        className={
          crear
            ? "flex flex-col gap-5 xl:flex-1"
            : "grid grid-cols-1 items-start gap-5 @xl:grid-cols-2"
        }
      >
        <CampoTexto
          id="cf-descripcion"
          etiqueta="Descripción"
          valor={descripcion}
          onChange={(v) => {
            setDescripcion(v);
            campos.limpiar("descripcion");
          }}
          placeholder="Breve descripción del contenido del curso..."
          error={campos.errores.descripcion}
          deshabilitado={isPending}
        />

        <CampoTexto
          id="cf-indicaciones"
          etiqueta="Indicaciones"
          valor={indicaciones}
          onChange={(v) => {
            setIndicaciones(v);
            campos.limpiar("indicaciones");
          }}
          placeholder="Cómo inscribirse, qué tener a mano u otras indicaciones para el postulante..."
          error={campos.errores.indicaciones}
          deshabilitado={isPending}
        />
      </div>
    </div>
  );

  const avisoError = error && (
    <Aviso tono="danger">
      <p>{error.mensaje}</p>
      {error.ref && (
        <p className="mt-1 text-sm">
          Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código: {error.ref}
        </p>
      )}
    </Aviso>
  );

  const botonEnviar = (
    <button type="submit" disabled={isPending} aria-busy={isPending} className="btn-primario">
      {isPending && <Spinner />}
      {isPending
        ? crear
          ? "Creando…"
          : "Guardando…"
        : crear
          ? "Crear curso"
          : "Guardar cambios"}
    </button>
  );

  if (!crear) {
    return (
      <section
        aria-labelledby="cf-titulo"
        className="formulario-oferta tarjeta tarjeta-panel flex flex-col gap-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 id="cf-titulo" className="text-lg font-extrabold text-heading sm:text-xl">
            Datos del curso
          </h2>
          {!tarjeta.editando && (
            <BotonEditar
              tarjeta={tarjeta}
              texto="Editar"
              etiqueta="Editar datos del curso"
              className="btn-neutro btn-chico self-start text-primary hover:text-primary-hover sm:self-auto"
            />
          )}
        </div>

        {tarjeta.editando ? (
          <form
            id={tarjeta.idFormulario}
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby="cf-titulo"
            className="flex flex-col gap-5"
          >
            {camposCurso}
            {avisoError}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="btn-cancelar"
                onClick={pedirCancelar}
                disabled={isPending}
              >
                Cancelar
              </Button>
              {botonEnviar}
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <CampoLectura estiloPerfil chipVacio={false} label="Nombre" valor={guardado.nombre} />
            <CampoLectura
              estiloPerfil
              chipVacio={false}
              label="Link"
              valor={guardado.link ?? ""}
              vacio="Sin link"
              className="[&_dd]:break-all"
            />
            <CampoLectura
              estiloPerfil
              chipVacio={false}
              label="Descripción"
              valor={guardado.descripcion ?? ""}
              vacio="Sin descripción"
            />
            <CampoLectura
              estiloPerfil
              chipVacio={false}
              label="Indicaciones"
              valor={guardado.indicaciones ?? ""}
              vacio="Sin indicaciones"
            />
          </dl>
        )}

        <DialogoDescartarCambios
          abierto={confirmarDescarte}
          titulo="Datos del curso"
          onSeguirEditando={() => setConfirmarDescarte(false)}
          onDescartar={() => {
            setConfirmarDescarte(false);
            descartarCambios();
          }}
        />
      </section>
    );
  }

  return (
    // xl:mt-5: lugar para el rótulo "Vista previa…", que va por fuera de su
    // tarjeta (absolute) para que los bordes de las dos columnas coincidan.
    <form onSubmit={handleSubmit} noValidate className="formulario-oferta flex flex-col gap-6 xl:mt-5">
      <DetalleConLateral
        desde="xl"
        anchoLateral={380}
        separacion="gap-5"
        separacionColumnas="gap-6"
        principal={
          <section
            aria-labelledby="cf-titulo"
            className="tarjeta tarjeta-panel flex flex-col gap-5"
          >
            <h2 id="cf-titulo" className="text-lg font-extrabold text-heading sm:text-xl">
              Datos del curso
            </h2>
            {camposCurso}
          </section>
        }
        lateral={
          <>
            <section aria-labelledby="cf-vista-previa" className="relative flex flex-col gap-2 xl:gap-0">
              <h2
                id="cf-vista-previa"
                className="text-xs leading-4 font-extrabold tracking-[0.06em] text-neutral uppercase xl:absolute xl:bottom-[calc(100%+8px)] xl:left-0"
              >
                Vista previa para el postulante
              </h2>
              {/* Copia visual (inert): el formulario es la única fuente de los datos. */}
              <div inert>
                <TarjetaCurso
                  href="#"
                  nombre={nombre.trim() || "Nombre del curso"}
                  badge={<EstadoCursoBadge estado="asignado" />}
                  detalle={
                    <span suppressHydrationWarning>
                      Asignado el {formatFechaCorta(new Date().toISOString())}
                    </span>
                  }
                  descripcion={descripcion.trim() || "Breve descripción del contenido del curso."}
                  ejemplo={{ nombre: !nombre.trim(), descripcion: !descripcion.trim() }}
                  pista={{ texto: "Ver curso" }}
                >
                  <div className="mt-3 flex">
                    <span className="btn-primario inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap px-4 text-sm font-medium">
                      <PlayCircle className="h-4 w-4" aria-hidden="true" />
                      Empezar curso
                    </span>
                  </div>
                  {link.trim().startsWith("https://") && <BotonIrAlCurso link={link.trim()} />}
                </TarjetaCurso>
              </div>
            </section>

            <section aria-labelledby="cf-como-se-usa" className="tarjeta tarjeta-panel flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <IconoCuadro icono={Info} />
                <h2 id="cf-como-se-usa" className="text-lg font-extrabold text-heading">
                  Cómo se usa
                </h2>
              </div>
              <ol className="flex flex-col gap-3">
                {PASOS_CIRCUITO.map((texto, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] leading-normal text-foreground">
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-bold text-primary"
                    >
                      {i + 1}
                    </span>
                    {texto}
                  </li>
                ))}
              </ol>
            </section>
          </>
        }
      />

      {avisoError}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="btn-cancelar"
          onClick={() => {
            marcarNavegacionDelUsuario();
            router.push("/admin/cursos");
          }}
          disabled={isPending}
        >
          Cancelar
        </Button>
        {botonEnviar}
      </div>
    </form>
  );
}

/** Descripción e Indicaciones: desde xl crecen para igualar la altura de la otra columna. */
function CampoTexto({
  id,
  etiqueta,
  valor,
  onChange,
  placeholder,
  error,
  deshabilitado,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  error: string | null | undefined;
  deshabilitado: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 xl:flex-1">
      <label htmlFor={id} className="etiqueta-campo">
        {etiqueta} <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <textarea
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={LARGO_MAXIMO.descripcion}
        className="campo min-h-[112px] resize-y xl:flex-1 xl:resize-none"
        disabled={deshabilitado}
        {...ariaErrorCampo(id, error)}
      />
      <div className="flex items-start justify-between gap-3">
        <ErrorCampo idCampo={id} mensaje={error} />
        <ContadorCaracteres className="ml-auto text-[13px]" actual={valor.length} maximo={LARGO_MAXIMO.descripcion} />
      </div>
    </div>
  );
}
