import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarraProgreso } from "@/components/ui/barra-progreso";
import { ContactoOficina } from "@/components/public/contacto-oficina";
import { EstadoVacioPostulaciones } from "@/components/public/estado-vacio-postulaciones";
import { requerirRolPagina } from "@/lib/auth";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Comparación de Tu actividad | Portal de Empleo Funes",
};

type EstadoCampanaProps = {
  invitaciones: number;
};

function EstadoCampana({ invitaciones }: EstadoCampanaProps) {
  return (
    <div
      role="status"
      aria-label={
        invitaciones > 0
          ? `Campana de notificaciones: ${invitaciones} invitaciones nuevas, ejemplo`
          : "Campana de notificaciones: sin avisos"
      }
      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm font-semibold text-muted-foreground-strong"
    >
      <span className="relative grid size-5 place-items-center">
        <Bell aria-hidden="true" className="size-4 text-primary" />
        {invitaciones > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] leading-none font-extrabold text-accent-foreground"
          >
            {invitaciones > 9 ? "9+" : invitaciones}
          </span>
        )}
      </span>
      {invitaciones > 0 ? `${invitaciones} invitaciones nuevas` : "Sin avisos"}
    </div>
  );
}

function EncabezadoActividad() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h3 className="text-[26px] leading-tight font-extrabold">Tu actividad</h3>
      <Link
        href="/panel"
        className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] text-[15px] font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
      >
        Ir a mi panel
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function EncabezadoPostulaciones({ cantidad }: { cantidad: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-lg font-extrabold">Tus postulaciones</h4>
      <Badge tono={cantidad === 0 ? "neutral" : "success"} icono={BriefcaseBusiness}>
        {cantidad === 0 ? "0 activas" : `${cantidad} activas`}
      </Badge>
    </div>
  );
}

function InvitacionPendiente({ bloqueada = false }: { bloqueada?: boolean }) {
  return (
    <section
      aria-label="Invitación pendiente de ejemplo"
      className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="font-bold text-foreground">Invitación pendiente</h5>
        <Badge tono="warning" icono={Mail}>
          Invitación
        </Badge>
      </div>

      <p className="mt-3 font-bold text-foreground">[Oferta]</p>
      <p className="mt-1 text-sm font-semibold text-muted-foreground-strong">[Empresa]</p>
      <p className="mt-1 text-sm text-muted-foreground-strong">Invitación recibida: [fecha]</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground-strong">
        La Oficina de Empleo te sugirió esta oferta.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {bloqueada ? (
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-secondary px-4 text-[15px] font-bold text-muted-foreground-strong"
          >
            <LockKeyhole aria-hidden="true" className="size-4" />
            Postularme
          </button>
        ) : (
          <Link href="/ofertas" className="btn-primario justify-center">
            Postularme
          </Link>
        )}
        <Link href="/ofertas" className="btn-secundario justify-center">
          Ver oferta
        </Link>
      </div>

    </section>
  );
}

function EnlaceMisPostulaciones({ primario = false }: { primario?: boolean }) {
  return (
    <Link
      href="/mis-postulaciones"
      className={primario ? "btn-primario justify-center" : "btn-secundario justify-center"}
    >
      Ver mis postulaciones
    </Link>
  );
}

function InvitacionesAdicionales({ cantidad }: { cantidad: number }) {
  if (cantidad <= 1) return null;

  return (
    <Link
      href="/invitaciones"
      className="inline-flex min-h-11 items-center gap-1 self-start rounded-[var(--radius-md)] text-sm font-bold text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
    >
      Ver todas las invitaciones ({cantidad})
      <ChevronRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

function ProgresoPostulacion({ etapa }: { etapa: "enviada" | "revision" }) {
  const pasos = ["Enviada", "En revisión", "Resultado"] as const;
  const pasoActual = etapa === "enviada" ? 0 : 1;

  return (
    <ol
      aria-label={`Etapa actual: ${pasos[pasoActual]}`}
      className="grid grid-cols-3 items-start"
    >
      {pasos.map((paso, indice) => {
        const completo = indice < pasoActual;
        const actual = indice === pasoActual;

        return (
          <li
            key={paso}
            aria-current={actual ? "step" : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center"
          >
            {indice > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-2.5 right-1/2 left-[-50%] h-0.5 ${
                  indice <= pasoActual ? "bg-primary" : "bg-border-strong"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative grid size-5 place-items-center rounded-full border-2 ${
                completo
                  ? "border-primary bg-primary text-white"
                  : actual
                    ? "border-[3px] border-primary bg-surface text-primary"
                    : "border-border-strong bg-surface text-muted-foreground"
              }`}
            >
              {completo ? (
                <Check className="size-3" />
              ) : actual ? (
                <Circle className="size-2 fill-current" />
              ) : null}
            </span>
            <span
              className={`text-[12px] leading-tight font-bold ${
                actual ? "text-primary" : "text-muted-foreground-strong"
              }`}
            >
              {paso}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function FilaPostulacion({
  titulo,
  estado,
  etapa,
}: {
  titulo: string;
  estado: "Enviada a la empresa" | "En revisión";
  etapa: "enviada" | "revision";
}) {
  return (
    <li className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-bold text-foreground">{titulo}</p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground-strong">{estado}</p>
        </div>
      </div>
      <ProgresoPostulacion etapa={etapa} />
    </li>
  );
}

function PerfilIncompleto({
  destacado = false,
  mostrarPendientes = false,
  mostrarChecklist = false,
  beneficio = false,
  id,
  primeroEnMovil = false,
}: {
  destacado?: boolean;
  mostrarPendientes?: boolean;
  mostrarChecklist?: boolean;
  beneficio?: boolean | string;
  id?: string;
  primeroEnMovil?: boolean;
}) {
  const porcentaje = mostrarChecklist ? 80 : 29;

  return (
    <article
      id={id}
      className={`tarjeta flex h-full flex-col gap-4 p-4 sm:p-6 ${
        destacado ? "border-primary/40 bg-surface-tinted" : ""
      } ${primeroEnMovil ? "order-first xl:order-none" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-lg font-extrabold">Completá tu perfil</h4>
      </div>

      <div className="flex items-center gap-3">
        <BarraProgreso
          porcentaje={porcentaje}
          etiqueta={`Perfil completo al ${porcentaje} por ciento, ejemplo`}
        />
        <span className="shrink-0 text-sm font-bold text-foreground">{porcentaje}%</span>
      </div>

      {mostrarChecklist ? (
        <>
          <p className="text-sm font-semibold text-muted-foreground-strong">
            Completá tu perfil para poder postularte.
          </p>
          <div className="flex flex-1 flex-col">
            <p className="text-sm font-bold text-foreground">Avance de tu perfil:</p>
            <ul className="mt-2 flex flex-1 flex-col divide-y divide-border">
              {[
                { nombre: "Foto de perfil", completo: true, accion: "Editar" },
                { nombre: "Formación", completo: true, accion: "Editar" },
                { nombre: "Experiencia", completo: true, accion: "Editar" },
                { nombre: "CV", completo: true, accion: "Editar" },
                {
                  nombre: "Comprobante de domicilio en Funes",
                  completo: false,
                  accion: "Subir",
                },
              ].map(({ nombre, completo, accion }) => (
                <li
                  key={nombre}
                  className="flex min-h-11 items-center gap-2 py-1.5 text-sm text-muted-foreground-strong"
                >
                  {completo ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 shrink-0 text-success"
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground-strong"
                    />
                  )}
                  <span className="min-w-0 flex-1">{nombre}</span>
                  <span className="sr-only">{completo ? "Completado" : "Pendiente"}</span>
                  <Link
                    href="/perfil"
                    aria-label={`${accion} ${nombre}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-md)] px-2 font-bold text-primary underline underline-offset-2 outline-none focus-visible:shadow-[var(--sombra-foco)]"
                  >
                    {accion}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground-strong">
            {typeof beneficio === "string"
              ? beneficio
              : "Con tu perfil completo vas a poder postularte a las ofertas sugeridas."}
          </p>
        </>
      ) : mostrarPendientes ? (
        <>
          <p className="text-sm font-semibold text-muted-foreground-strong">
            Completá tu perfil para poder postularte.
          </p>
          <div>
            <p className="text-sm font-bold text-foreground">Te falta completar:</p>
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-muted-foreground-strong">
              <li>Foto</li>
              <li>Formación</li>
              <li>Experiencia</li>
              <li>CV</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-col justify-center rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4">
            <p className="font-bold text-foreground">Agregá una foto de perfil</p>
            {beneficio && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground-strong">
                Un perfil completo recibe más respuestas de las empresas.
              </p>
            )}
          </div>
        </>
      )}

      <Link
        href="/perfil"
        className={
          mostrarPendientes
            ? "btn-primario min-h-11 justify-center"
            : "btn-secundario justify-center self-start"
        }
      >
        {mostrarPendientes ? "Completar mi perfil" : "Completar perfil"}
      </Link>
    </article>
  );
}

function PerfilCompleto() {
  return (
    <article className="tarjeta flex h-full flex-col gap-4 p-4 sm:p-6">
      <h4 className="text-lg font-extrabold">Completá tu perfil</h4>
      <div className="flex items-center gap-3">
        <BarraProgreso porcentaje={100} etiqueta="Perfil completo al 100 por ciento, ejemplo" />
        <span className="shrink-0 text-sm font-bold text-foreground">100%</span>
      </div>
      <div className="flex flex-1 items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4">
        <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success" />
        <p className="font-bold text-foreground">Perfil completo</p>
      </div>
      <Link href="/perfil" className="btn-secundario justify-center self-start">
        Ver mi perfil
      </Link>
    </article>
  );
}

function Caso({
  numero,
  nombre,
  campana,
  tresColumnas = false,
  children,
}: {
  numero: string;
  nombre: string;
  campana: number;
  tresColumnas?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`caso-${numero}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold tracking-[0.12em] text-primary">
            ARTBOARD {numero}
          </span>
          <span aria-hidden="true" className="text-muted-icon">
            ·
          </span>
          <h2 id={`caso-${numero}`} className="text-sm font-bold text-muted-foreground-strong">
            {nombre}
          </h2>
        </div>
        <EstadoCampana invitaciones={campana} />
      </div>

      <div className="rounded-[var(--radius-xl)] border border-border bg-background px-4 pt-8 pb-4 sm:px-6 sm:pt-10 sm:pb-6 lg:px-8 lg:pt-12 lg:pb-8">
        <EncabezadoActividad />
        <div
          className={`mt-6 grid grid-cols-1 items-stretch gap-4 ${
            tresColumnas ? "xl:grid-cols-3" : "xl:grid-cols-2"
          }`}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function TarjetaInvitaciones({
  cantidad,
  primeroEnMovil = false,
}: {
  cantidad: number;
  primeroEnMovil?: boolean;
}) {
  return (
    <article
      className={`tarjeta flex h-full flex-col gap-4 p-4 sm:p-6 ${
        primeroEnMovil ? "order-2 xl:order-none" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-lg font-extrabold">Invitaciones pendientes</h4>
        <Badge tono="warning" icono={Mail}>
          {cantidad} {cantidad === 1 ? "invitación" : "invitaciones"}
        </Badge>
      </div>
      <InvitacionPendiente bloqueada />
    </article>
  );
}

function TarjetaInvitacion({
  cantidadInvitaciones,
  bloqueada = false,
  primeroEnMovil = false,
}: {
  cantidadInvitaciones: number;
  bloqueada?: boolean;
  primeroEnMovil?: boolean;
}) {
  return (
    <article
      className={`tarjeta flex h-full flex-col gap-4 p-4 sm:p-6 ${
        primeroEnMovil ? "order-last xl:order-none" : ""
      }`}
    >
      <EncabezadoPostulaciones cantidad={0} />
      {bloqueada && <EstadoVacioPostulaciones compacto mostrarApoyo={false} />}
      <InvitacionPendiente bloqueada={bloqueada} />
      {!bloqueada && <EstadoVacioPostulaciones compacto mostrarApoyo={false} />}
      <InvitacionesAdicionales cantidad={cantidadInvitaciones} />
      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <Link href="/ofertas" className="btn-secundario justify-center">
          Explorar ofertas
        </Link>
        <EnlaceMisPostulaciones />
      </div>
    </article>
  );
}

function TarjetaSinActividad() {
  return (
    <article className="tarjeta flex h-full flex-col gap-4 p-4 sm:p-6">
      <EncabezadoPostulaciones cantidad={0} />
      <EstadoVacioPostulaciones />
      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        <Link href="/ofertas" className="btn-primario justify-center">
          Explorar ofertas
        </Link>
        <EnlaceMisPostulaciones />
      </div>
    </article>
  );
}

function TarjetaPostulaciones({
  cantidad,
  mostrarAlDia,
  primaria = false,
  primeroEnMovil = false,
  sinPostulaciones = false,
}: {
  cantidad: number;
  mostrarAlDia: boolean;
  primaria?: boolean;
  primeroEnMovil?: boolean;
  sinPostulaciones?: boolean;
}) {
  return (
    <article
      className={`tarjeta flex h-full flex-col gap-3 p-4 sm:p-6 ${
        primeroEnMovil ? "order-last xl:order-none" : ""
      }`}
    >
      <EncabezadoPostulaciones cantidad={cantidad} />
      {sinPostulaciones ? (
        <EstadoVacioPostulaciones compacto />
      ) : (
        <ul aria-label="Postulaciones recientes de ejemplo" className="flex flex-1 flex-col">
          <FilaPostulacion
            titulo="[Oferta 1]"
            estado="En revisión"
            etapa="revision"
          />
          <FilaPostulacion
            titulo="[Oferta 2]"
            estado="Enviada a la empresa"
            etapa="enviada"
          />
        </ul>
      )}
      {mostrarAlDia && (
        <p className="flex items-start gap-2 rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-3 text-sm font-semibold text-muted-foreground-strong">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          Estás al día. No tenés novedades por ahora.
        </p>
      )}
      <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
        <EnlaceMisPostulaciones primario={primaria} />
        {!primaria && (
          <Link href="/ofertas" className="btn-secundario justify-center">
            Explorar ofertas
          </Link>
        )}
      </div>
    </article>
  );
}

export default async function ComparacionActividadPage() {
  await requerirRolPagina("postulante");

  return (
    <main className="flex flex-1 flex-col gap-8">
      <BotonVolver href="/panel" destacado className="-mb-4" />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold">Comparación de “Tu actividad”</h1>
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground-strong">
          Siete variantes con el mismo layout. Los datos, cantidades y porcentajes son ejemplos:
          [Oferta], [Empresa] y [fecha] son marcadores, no información real.
        </p>
      </header>

      <Caso
        numero="01"
        nombre="Sin postulaciones, con invitación pendiente"
        campana={3}
      >
        <TarjetaInvitacion cantidadInvitaciones={3} />
        <PerfilIncompleto />
      </Caso>

      <Caso numero="02" nombre="Con postulaciones y sin notificaciones" campana={0}>
        <TarjetaPostulaciones cantidad={3} mostrarAlDia primaria />
        <PerfilCompleto />
      </Caso>

      <Caso
        numero="03"
        nombre="Con invitaciones, postulaciones y perfil incompleto"
        campana={3}
        tresColumnas
      >
        <TarjetaPostulaciones
          cantidad={3}
          mostrarAlDia={false}
          primeroEnMovil
        />
        <TarjetaInvitaciones cantidad={3} primeroEnMovil />
        <PerfilIncompleto
          destacado
          mostrarPendientes
          mostrarChecklist
          id="perfil-caso-03"
          primeroEnMovil
        />
      </Caso>

      <Caso
        numero="04"
        nombre="Postulante nuevo, sin postulaciones, con invitaciones y perfil incompleto"
        campana={3}
        tresColumnas
      >
        <TarjetaPostulaciones
          cantidad={0}
          mostrarAlDia={false}
          primeroEnMovil
          sinPostulaciones
        />
        <TarjetaInvitaciones cantidad={3} primeroEnMovil />
        <PerfilIncompleto
          destacado
          mostrarPendientes
          mostrarChecklist
          id="perfil-caso-04"
          primeroEnMovil
        />
      </Caso>

      <Caso
        numero="05"
        nombre="Con postulaciones, perfil incompleto y sin notificaciones"
        campana={0}
      >
        <TarjetaPostulaciones
          cantidad={3}
          mostrarAlDia={false}
          primeroEnMovil
        />
        <PerfilIncompleto
          beneficio="Un perfil completo recibe más respuestas de las empresas."
          destacado
          mostrarPendientes
          mostrarChecklist
          primeroEnMovil
        />
      </Caso>

      <Caso numero="06" nombre="Sin actividad y perfil en progreso" campana={0}>
        <TarjetaSinActividad />
        <PerfilIncompleto />
      </Caso>

      <Caso numero="07" nombre="Sin actividad y perfil incompleto destacado" campana={0}>
        <TarjetaSinActividad />
        <PerfilIncompleto destacado mostrarPendientes />
      </Caso>

      <ContactoOficina />
    </main>
  );
}
