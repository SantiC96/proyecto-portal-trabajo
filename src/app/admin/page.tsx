import type { Metadata } from "next";
import Link from "next/link";
import { logError } from "@/lib/logger";
import {
  BookOpen,
  Briefcase,
  Building2,
  ChartColumn,
  ClipboardList,
  House,
  Inbox,
  LayoutGrid,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { UMBRAL_RECHAZOS_CURSO } from "@/lib/cursos";
import { requerirRolPagina } from "@/lib/auth";
import { contarPendientesOficina } from "@/lib/admin/pendientes";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import {
  CLASE_GRILLA_CUADROS,
  ChipAccionCuadro,
  CuadroEstado,
  claseCeldaCuadro,
} from "@/components/ui/cuadro-estado";
import { TarjetaAcceso } from "@/components/ui/tarjeta-acceso";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Panel municipal | Portal de Empleo Funes",
};

export default async function AdminDashboardPage() {
  const usuario = await requerirRolPagina("municipalidad");
  const supabase = await createSupabaseServerClient();

  // Ofertas, empresas y comprobantes: los mismos conteos que la navegación
  // lateral (las empresas sin email confirmado no cuentan, migration_042).
  const [
    { count: postulacionesPendientes },
    { count: totalPostulantes },
    esperandoCursoRes,
    { count: cursosActivos },
    pendientesOficina,
    cuentasRes,
  ] = await Promise.all([
    supabase
      .from("postulaciones")
      .select("*", { count: "exact", head: true })
      .in("estado", ["recibida", "en_revision"]),
    supabase.from("postulantes").select("*", { count: "exact", head: true }),
    supabase.rpc("contar_postulantes_esperando_curso"),
    supabase
      .from("cursos")
      .select("*", { count: "exact", head: true })
      .eq("activo", true),
    contarPendientesOficina(supabase),
    supabase.rpc("listar_cuentas_oficina"),
  ]);

  if (esperandoCursoRes.error)
    logError("contar_postulantes_esperando_curso", esperandoCursoRes.error);
  const postulantesEsperando = Number(esperandoCursoRes.data ?? 0);
  if (cuentasRes.error) logError("admin_panel_cuentas", cuentasRes.error);
  const cuentasActivas = (cuentasRes.data ?? []).filter((c) => c.activo).length;

  const pendientes = [
    {
      href: "/admin/postulaciones",
      icono: ClipboardList,
      titulo: "Postulaciones por revisar",
      accion: "Revisar postulaciones",
      cantidad: postulacionesPendientes ?? 0,
    },
    {
      href: "/admin/ofertas",
      icono: Briefcase,
      titulo: "Ofertas por aprobar",
      accion: "Revisar ofertas",
      cantidad: pendientesOficina?.ofertas ?? 0,
    },
    {
      href: "/admin/empresas",
      icono: Building2,
      titulo: "Empresas por aprobar",
      accion: "Revisar empresas",
      cantidad: pendientesOficina?.empresas ?? 0,
    },
    {
      href: "/admin/comprobantes",
      icono: House,
      titulo: "Comprobantes por revisar",
      accion: "Revisar comprobantes",
      cantidad: pendientesOficina?.comprobantes ?? 0,
    },
    {
      href: "/admin/postulantes",
      icono: UserX,
      titulo: `Postulantes con ${UMBRAL_RECHAZOS_CURSO} o más rechazos`,
      accion: "Ver postulantes",
      cantidad: postulantesEsperando,
    },
  ];

  const nombre = usuario.perfil.nombre.trim();
  const activos = cursosActivos ?? 0;
  const registrados = totalPostulantes ?? 0;
  const totalPendientes = pendientes.reduce((suma, p) => suma + p.cantidad, 0);

  return (
    <section className="flex flex-col gap-8">
      <BotonVolver href="/" destacado />
      <EncabezadoPagina
        banda
        className="-mt-4"
        botonesBlancos
        titulo={nombre ? `Hola, ${nombre}` : "Hola"}
        bajada="Esto es lo que tiene pendiente la Oficina de Empleo."
        acciones={
          <Link href="/admin/indicadores" className="btn-neutro">
            <ChartColumn aria-hidden="true" />
            Ver indicadores
          </Link>
        }
      />

      <section aria-labelledby="panel-pendientes" className="@container flex flex-col gap-4">
        <TituloBloque
          id="panel-pendientes"
          titulo="Pendientes"
          icono={Inbox}
          bajada={
            totalPendientes === 0
              ? "Estás al día."
              : `Hay ${totalPendientes} ${totalPendientes === 1 ? "cosa" : "cosas"} para revisar.`
          }
        />
        <ul className={CLASE_GRILLA_CUADROS}>
          {pendientes.map((p, i) => {
            const alDia = p.cantidad === 0;
            return (
              <li key={p.href} className={claseCeldaCuadro(i)}>
                <CuadroEstado
                  href={p.href}
                  etiqueta={p.titulo}
                  etiquetaAccesible={`${p.titulo}: ${p.cantidad}. ${alDia ? "Al día" : p.accion}`}
                  valor={p.cantidad}
                  icono={p.icono}
                  claseIcono={alDia ? "bg-muted-icon" : "bg-primary"}
                  claseFilete={alDia ? "before:bg-muted-icon" : "before:bg-accent"}
                  apagado={alDia}
                  pie={<ChipAccionCuadro accion={p.accion} alDia={alDia} />}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="panel-accesos" className="flex flex-col gap-4">
        <TituloBloque id="panel-accesos" titulo="Accesos" icono={LayoutGrid} />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <li>
            <TarjetaAcceso
              href="/admin/cursos"
              icono={<BookOpen className="size-[22px]" />}
              titulo="Cursos"
              descripcion="Cursos de inserción laboral e inscriptos"
              detalle={
                activos > 0
                  ? `${activos} curso${activos === 1 ? "" : "s"} activo${activos === 1 ? "" : "s"}`
                  : undefined
              }
              elevable
            />
          </li>
          <li>
            <TarjetaAcceso
              href="/admin/indicadores"
              icono={<ChartColumn className="size-[22px]" />}
              titulo="Indicadores"
              descripcion="Números del portal para informes"
              claseIcono="bg-teal text-white"
              elevable
            />
          </li>
          <li>
            <TarjetaAcceso
              href="/admin/postulantes"
              icono={<Users className="size-[22px]" />}
              titulo="Postulantes"
              descripcion="Buscá candidatos por rubro y revisá sus CVs"
              detalle={
                registrados > 0
                  ? `${registrados} registrado${registrados === 1 ? "" : "s"}`
                  : undefined
              }
              claseIcono="bg-info text-white"
              elevable
            />
          </li>
          <li>
            <TarjetaAcceso
              href="/admin/cuentas"
              icono={<UserCog className="size-[22px]" />}
              titulo="Cuentas de la oficina"
              descripcion="Invitá, desactivá o reactivá las cuentas del personal"
              detalle={
                cuentasActivas > 0
                  ? `${cuentasActivas} cuenta${cuentasActivas === 1 ? "" : "s"} activa${cuentasActivas === 1 ? "" : "s"}`
                  : undefined
              }
              claseIcono="bg-neutral text-white"
              elevable
            />
          </li>
        </ul>
      </section>
    </section>
  );
}
