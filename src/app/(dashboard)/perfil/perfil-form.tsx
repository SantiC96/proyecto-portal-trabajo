"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Mail, MapPin, Phone, Plus, User, X } from "lucide-react";
import { actualizarPerfil, actualizarRubros } from "./actions";
import { SeccionCvs } from "./seccion-cvs";
import { SeccionProcedencia, type ComprobantePerfil } from "./seccion-procedencia";
import type { CvVista } from "@/lib/cvs";
import { LARGO_MAXIMO, validarNombre, validarDNI, validarTelefono } from "@/lib/validaciones";
import type { Rol, Tabla } from "@/types/db";
import { mostrarAviso } from "@/lib/avisos";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCampo, Obligatorio, ariaErrorCampo } from "@/components/ui/obligatorio";
import {
  CLASE_AYUDA_PERFIL,
  CLASE_CAMPO_CON_ICONO,
  CLASE_CAMPO_PERFIL,
  CLASE_ERROR_PERFIL,
  CLASE_ETIQUETA_PERFIL,
  FieldIcon,
  InputWrapper,
  PieSeccion,
  SeccionPerfil,
  type FotoPerfil,
} from "@/components/perfil/piezas";
import { EncabezadoPerfil } from "@/components/perfil/encabezado-perfil";
import { inicialesDePersona } from "@/lib/iniciales";
import { SECCION_PERFIL } from "@/lib/perfil-secciones";
import { SeccionContrasena } from "@/components/perfil/seccion-contrasena";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { ContadorCaracteres } from "@/components/ui/contador-caracteres";
import { clasePastilla } from "@/components/ui/pastilla-filtro";
import {
  DISPONIBILIDADES,
  DISPONIBILIDAD_LABEL,
  LARGO_MAXIMO_EXPERIENCIA,
  NIVELES_EDUCATIVOS,
  NIVEL_EDUCATIVO_LABEL,
  SIN_COMPLETAR,
  SITUACIONES_LABORALES,
  SITUACION_LABORAL_LABEL,
} from "@/lib/informacion-laboral";

type CampoDatos = "nombre" | "apellido" | "telefono" | "domicilio" | "dni";
type CampoLaboral = "nivelEducativo" | "situacionLaboral" | "disponibilidad" | "experienciaLaboral";

const CAMPOS_DATOS: readonly CampoDatos[] = ["nombre", "apellido", "telefono", "domicilio", "dni"];
const CAMPOS_LABORAL: readonly CampoLaboral[] = [
  "nivelEducativo",
  "situacionLaboral",
  "disponibilidad",
  "experienciaLaboral",
];

type DatosPersonales = Record<CampoDatos, string>;
type InformacionLaboral = Record<CampoLaboral, string>;

// ─── tipos ───────────────────────────────────────────────────────────────────

interface PerfilFormProps {
  usuario: {
    nombre: string;
    apellido: string;
    telefono: string;
    rol: Rol | null;
    avatarActivo: FotoPerfil | null;
  };
  postulante: {
    id: string;
    dni: string;
    domicilio: string;
    nivelEducativo: string;
    situacionLaboral: string;
    disponibilidad: string;
    experienciaLaboral: string;
    cvs: CvVista[];
  };
  procedencia: {
    localidad: string | null;
    comprobante: ComprobantePerfil | null;
  };
  email: string;
  categorias: Pick<Tabla<"categorias">, "id" | "nombre">[];
  categoriasSeleccionadas: string[];
}

// ─── componente ──────────────────────────────────────────────────────────────

/**
 * Secciones de "Mi perfil" del postulante, cada una con su tarjeta y su botón
 * Guardar. Datos personales e información laboral se guardan con la misma
 * acción (actualizarPerfil): cada sección manda sus campos y los últimos
 * guardados de la otra, así guardar una no guarda lo que se esté editando en
 * la otra.
 */
export function PerfilForm({
  usuario,
  postulante,
  procedencia,
  email,
  categorias,
  categoriasSeleccionadas,
}: PerfilFormProps) {
  const router = useRouter();

  const [datosGuardados, setDatosGuardados] = useState<DatosPersonales>({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    telefono: usuario.telefono,
    domicilio: postulante.domicilio,
    dni: postulante.dni,
  });
  const [laboralGuardada, setLaboralGuardada] = useState<InformacionLaboral>({
    nivelEducativo: postulante.nivelEducativo,
    situacionLaboral: postulante.situacionLaboral,
    disponibilidad: postulante.disponibilidad,
    experienciaLaboral: postulante.experienciaLaboral,
  });

  return (
    <div className="flex flex-col gap-6">
      <div id={SECCION_PERFIL.foto} className="scroll-mt-20">
        <EncabezadoPerfil
          tituloSeccion="Foto"
          avatarActivo={usuario.avatarActivo}
          titulo={`${usuario.nombre} ${usuario.apellido}`}
          subtitulo="Postulante"
          iniciales={inicialesDePersona(usuario.nombre, usuario.apellido)}
        />
      </div>

      <SeccionDatosPersonales
        guardados={datosGuardados}
        email={email}
        onGuardar={async (datos) => {
          const result = await actualizarPerfil({ ...laboralGuardada, ...datos });
          if (result.ok) {
            setDatosGuardados({
              nombre: datos.nombre.trim(),
              apellido: datos.apellido.trim(),
              telefono: datos.telefono.trim(),
              domicilio: datos.domicilio.trim(),
              dni: datos.dni.replace(/\D/g, ""),
            });
            router.refresh();
          }
          return result;
        }}
      />

      <SeccionProcedencia localidad={procedencia.localidad} comprobante={procedencia.comprobante} />

      <SeccionInformacionLaboral
        guardada={laboralGuardada}
        onGuardar={async (laboral) => {
          const result = await actualizarPerfil({ ...datosGuardados, ...laboral });
          if (result.ok) {
            setLaboralGuardada({ ...laboral, experienciaLaboral: laboral.experienciaLaboral.trim() });
            router.refresh();
          }
          return result;
        }}
      />

      <SeccionRubros categorias={categorias} iniciales={categoriasSeleccionadas} />

      <SeccionCvs cvs={postulante.cvs} />

      <SeccionContrasena id={SECCION_PERFIL.contrasena} />
    </div>
  );
}

type GuardarPerfil<T> = (valores: T) => ReturnType<typeof actualizarPerfil>;

function BotonGuardar({ pendiente }: { pendiente: boolean }) {
  return (
    <button type="submit" disabled={pendiente} aria-busy={pendiente} className="btn-primario">
      {pendiente && <Spinner />}
      {pendiente ? "Guardando…" : "Guardar"}
    </button>
  );
}

// ─── Datos personales ────────────────────────────────────────────────────────

function SeccionDatosPersonales({
  guardados,
  email,
  onGuardar,
}: {
  guardados: DatosPersonales;
  email: string;
  onGuardar: GuardarPerfil<DatosPersonales>;
}) {
  const [valores, setValores] = useState(guardados);
  const campos = useErroresCampo<CampoDatos>();
  const { pendiente, ejecutar } = useAccion();

  function cambiar(campo: CampoDatos, valor: string) {
    setValores((v) => ({ ...v, [campo]: valor }));
    campos.limpiar(campo);
  }

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { nombre, apellido, dni, telefono } = valores;
    if (!campos.validar({ nombre, apellido, dni }, e.currentTarget)) return;
    const erroresCliente = [
      ["nombre", validarNombre(nombre)],
      ["apellido", validarNombre(apellido)],
      ["dni", validarDNI(dni)],
      ["telefono", validarTelefono(telefono)],
    ] as const;
    const primerError = erroresCliente.find(([, mensaje]) => mensaje);
    if (primerError?.[1]) {
      campos.marcar(primerError[0], primerError[1]);
      return;
    }
    ejecutar(async () => {
      const result = await onGuardar(valores);
      if (!campos.tomarDelServidor(result, CAMPOS_DATOS)) mostrarAviso(result);
      if (!result.ok) return;
      setValores((v) => ({
        nombre: v.nombre.trim(),
        apellido: v.apellido.trim(),
        telefono: v.telefono.trim(),
        domicilio: v.domicilio.trim(),
        dni: v.dni.replace(/\D/g, ""),
      }));
    });
  }

  return (
    <SeccionPerfil id={SECCION_PERFIL.datos} titulo="Datos personales">
      <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTexto
            id="p-nombre"
            etiqueta="Nombre"
            obligatorio
            icono={User}
            valor={valores.nombre}
            onCambio={(v) => cambiar("nombre", v)}
            error={campos.errores.nombre}
            autoComplete="given-name"
            placeholder="Ej: María"
          />
          <CampoTexto
            id="p-apellido"
            etiqueta="Apellido"
            obligatorio
            icono={User}
            valor={valores.apellido}
            onCambio={(v) => cambiar("apellido", v)}
            error={campos.errores.apellido}
            autoComplete="family-name"
            placeholder="Ej: González"
          />
          <CampoTexto
            id="p-telefono"
            etiqueta="Teléfono / Celular"
            icono={Phone}
            tipo="tel"
            valor={valores.telefono}
            onCambio={(v) => cambiar("telefono", v)}
            error={campos.errores.telefono}
            autoComplete="tel"
            placeholder="Ej: 341 5678901"
          />
          <CampoTexto
            id="p-domicilio"
            etiqueta="Domicilio"
            icono={MapPin}
            valor={valores.domicilio}
            onCambio={(v) => cambiar("domicilio", v)}
            error={campos.errores.domicilio}
            autoComplete="street-address"
            placeholder="Calle y número (Ej: San Martín 432)"
            maxLength={LARGO_MAXIMO.domicilio}
          />
          <CampoTexto
            id="p-dni"
            etiqueta="DNI"
            obligatorio
            icono={CreditCard}
            valor={valores.dni}
            onCambio={(v) => cambiar("dni", v.replace(/\D/g, "").slice(0, 8))}
            error={campos.errores.dni}
            autoComplete="off"
            inputMode="numeric"
            placeholder="12345678"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-email" className={CLASE_ETIQUETA_PERFIL}>
              Email
            </label>
            <InputWrapper>
              <FieldIcon icon={Mail} />
              <input
                id="p-email"
                type="email"
                readOnly
                value={email}
                aria-describedby="p-email-ayuda"
                className={`${CLASE_CAMPO_CON_ICONO} cursor-default bg-surface-tinted text-muted-foreground-strong`}
              />
            </InputWrapper>
            <p id="p-email-ayuda" className={CLASE_AYUDA_PERFIL}>
              No editable.
            </p>
          </div>
        </div>
        <PieSeccion>
          <BotonGuardar pendiente={pendiente} />
        </PieSeccion>
      </form>
    </SeccionPerfil>
  );
}

function CampoTexto({
  id,
  etiqueta,
  obligatorio = false,
  icono,
  tipo = "text",
  valor,
  onCambio,
  error,
  ...props
}: {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  icono: React.ElementType;
  tipo?: "text" | "tel";
  valor: string;
  onCambio: (valor: string) => void;
  error: string | null | undefined;
} & Pick<
  React.ComponentProps<"input">,
  "autoComplete" | "placeholder" | "maxLength" | "inputMode"
>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={CLASE_ETIQUETA_PERFIL}>
        {etiqueta} {obligatorio && <Obligatorio />}
      </label>
      <InputWrapper>
        <FieldIcon icon={icono} />
        <input
          id={id}
          type={tipo}
          required={obligatorio}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          className={CLASE_CAMPO_CON_ICONO}
          {...props}
          {...ariaErrorCampo(id, error)}
        />
      </InputWrapper>
      <ErrorCampo idCampo={id} mensaje={error} className={CLASE_ERROR_PERFIL} />
    </div>
  );
}

// ─── Información laboral ─────────────────────────────────────────────────────

function SeccionInformacionLaboral({
  guardada,
  onGuardar,
}: {
  guardada: InformacionLaboral;
  onGuardar: GuardarPerfil<InformacionLaboral>;
}) {
  const [valores, setValores] = useState(guardada);
  const campos = useErroresCampo<CampoLaboral>();
  const { pendiente, ejecutar } = useAccion();

  function cambiar(campo: CampoLaboral, valor: string) {
    setValores((v) => ({ ...v, [campo]: valor }));
    campos.limpiar(campo);
  }

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ejecutar(async () => {
      const result = await onGuardar(valores);
      if (!campos.tomarDelServidor(result, CAMPOS_LABORAL)) mostrarAviso(result);
      if (!result.ok) return;
      setValores((v) => ({ ...v, experienciaLaboral: v.experienciaLaboral.trim() }));
    });
  }

  const selects: {
    campo: Exclude<CampoLaboral, "experienciaLaboral">;
    id: string;
    etiqueta: string;
    opciones: readonly string[];
    labels: Record<string, string>;
  }[] = [
    {
      campo: "nivelEducativo",
      id: "p-nivel-educativo",
      etiqueta: "Nivel educativo",
      opciones: NIVELES_EDUCATIVOS,
      labels: NIVEL_EDUCATIVO_LABEL,
    },
    {
      campo: "situacionLaboral",
      id: "p-situacion-laboral",
      etiqueta: "Situación laboral",
      opciones: SITUACIONES_LABORALES,
      labels: SITUACION_LABORAL_LABEL,
    },
    {
      campo: "disponibilidad",
      id: "p-disponibilidad",
      etiqueta: "Disponibilidad horaria",
      opciones: DISPONIBILIDADES,
      labels: DISPONIBILIDAD_LABEL,
    },
  ];

  return (
    <SeccionPerfil
      id={SECCION_PERFIL.informacionLaboral}
      titulo="Información laboral"
      ayuda="Opcional. La ven la Oficina de Empleo y las empresas a las que te deriven."
    >
      <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selects.map((s) => (
            <div key={s.campo} className="flex flex-col gap-1.5">
              <label htmlFor={s.id} className={CLASE_ETIQUETA_PERFIL}>
                {s.etiqueta}
              </label>
              <select
                id={s.id}
                value={valores[s.campo]}
                onChange={(e) => cambiar(s.campo, e.target.value)}
                className={CLASE_CAMPO_PERFIL}
                {...ariaErrorCampo(s.id, campos.errores[s.campo])}
              >
                <option value="">{SIN_COMPLETAR}</option>
                {s.opciones.map((v) => (
                  <option key={v} value={v}>
                    {s.labels[v]}
                  </option>
                ))}
              </select>
              <ErrorCampo
                idCampo={s.id}
                mensaje={campos.errores[s.campo]}
                className={CLASE_ERROR_PERFIL}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="p-experiencia-laboral" className={CLASE_ETIQUETA_PERFIL}>
              Experiencia laboral
            </label>
            <textarea
              id="p-experiencia-laboral"
              value={valores.experienciaLaboral}
              onChange={(e) => cambiar("experienciaLaboral", e.target.value)}
              placeholder="Contá en qué trabajaste, dónde y durante cuánto tiempo."
              maxLength={LARGO_MAXIMO_EXPERIENCIA}
              className={`${CLASE_CAMPO_PERFIL} min-h-32`}
              {...ariaErrorCampo("p-experiencia-laboral", campos.errores.experienciaLaboral)}
            />
            <ErrorCampo
              idCampo="p-experiencia-laboral"
              mensaje={campos.errores.experienciaLaboral}
              className={CLASE_ERROR_PERFIL}
            />
            <ContadorCaracteres
              actual={valores.experienciaLaboral.length}
              maximo={LARGO_MAXIMO_EXPERIENCIA}
            />
          </div>
        </div>
        <PieSeccion>
          <BotonGuardar pendiente={pendiente} />
        </PieSeccion>
      </form>
    </SeccionPerfil>
  );
}

// ─── Rubros de interés ───────────────────────────────────────────────────────

function SeccionRubros({
  categorias,
  iniciales,
}: {
  categorias: Pick<Tabla<"categorias">, "id" | "nombre">[];
  iniciales: string[];
}) {
  const router = useRouter();
  const idDisponibles = useId();
  const [categoriaIds, setCategoriaIds] = useState<string[]>(iniciales);
  const [agregando, setAgregando] = useState(false);
  const { pendiente, ejecutar } = useAccion();

  const elegidas = categorias.filter((c) => categoriaIds.includes(c.id));
  const disponibles = categorias.filter((c) => !categoriaIds.includes(c.id));

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(async () => {
      const result = await actualizarRubros(categoriaIds);
      mostrarAviso(result);
      if (!result.ok) return;
      setAgregando(false);
      router.refresh();
    });
  }

  return (
    <SeccionPerfil
      id={SECCION_PERFIL.rubros}
      titulo="Rubros de interés"
      ayuda="Seleccioná los rubros en los que te gustaría trabajar."
    >
      <form onSubmit={guardar} className="flex flex-col gap-5">
        {elegidas.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Rubros elegidos">
            {elegidas.map((c) => (
              <li
                key={c.id}
                className="inline-flex min-h-11 items-center rounded-[22px] border-[1.5px] border-primary bg-surface pl-4 text-[15px] font-semibold text-primary-hover sm:min-h-10"
              >
                {c.nombre}
                <button
                  type="button"
                  onClick={() => setCategoriaIds((ids) => ids.filter((id) => id !== c.id))}
                  disabled={pendiente}
                  aria-label={`Quitar ${c.nombre}`}
                  className="ml-0.5 inline-flex size-11 items-center justify-center rounded-full outline-none hover:bg-surface-tinted focus-visible:shadow-[var(--sombra-foco)] sm:size-10"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-muted-foreground">No seleccionaste rubros todavía.</p>
        )}

        {disponibles.length > 0 && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setAgregando((v) => !v)}
              aria-expanded={agregando}
              aria-controls={idDisponibles}
              disabled={pendiente}
              className="btn-neutro w-full sm:w-fit"
            >
              <Plus aria-hidden="true" />
              Agregar rubro
            </button>
            {agregando && (
              <ul id={idDisponibles} aria-label="Rubros disponibles" className="flex flex-wrap gap-2">
                {disponibles.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCategoriaIds((ids) => [...ids, c.id])}
                      disabled={pendiente}
                      className={clasePastilla(false)}
                    >
                      <Plus className="mr-1.5 size-4" aria-hidden="true" />
                      {c.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <PieSeccion>
          <BotonGuardar pendiente={pendiente} />
        </PieSeccion>
      </form>
    </SeccionPerfil>
  );
}
