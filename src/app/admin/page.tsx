import type { Metadata } from "next";
import { logError } from "@/lib/logger";
import {
  BookOpen,
  Briefcase,
  Building2,
  ChartColumn,
  ClipboardList,
  House,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { UMBRAL_RECHAZOS_CURSO } from "@/lib/cursos";
import { requerirRolPagina } from "@/lib/auth";
import { contarPendientesOficina } from "@/lib/admin/pendientes";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { TarjetaPendiente } from "@/components/ui/tarjeta-pendiente";
import { TarjetaAcceso } from "@/components/ui/tarjeta-acceso";

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
  ]);

  if (esperandoCursoRes.error)
    logError("contar_postulantes_esperando_curso", esperandoCursoRes.error);
  const postulantesEsperando = Number(esperandoCursoRes.data ?? 0);

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

  return (
    <section>
      <EncabezadoPagina
        titulo={nombre ? `Hola, ${nombre}` : "Hola"}
        bajada="Esto es lo que tiene pendiente la Oficina de Empleo."
      />

      <section aria-labelledby="panel-pendientes" className="@container mt-8">
        <h2 id="panel-pendientes" className="text-[22px] leading-tight font-extrabold text-heading">
          Pendientes
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {pendientes.map((p) => (
            <li key={p.href}>
              <TarjetaPendiente {...p} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="panel-accesos" className="mt-10">
        <h2 id="panel-accesos" className="text-[22px] leading-tight font-extrabold text-heading">
          Accesos
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            />
          </li>
          <li>
            <TarjetaAcceso
              href="/admin/indicadores"
              icono={<ChartColumn className="size-[22px]" />}
              titulo="Indicadores"
              descripcion="Números del portal para informes"
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
            />
          </li>
          <li>
            <TarjetaAcceso
              href="/admin/cuentas"
              icono={<UserCog className="size-[22px]" />}
              titulo="Cuentas de la oficina"
              descripcion="Invitá, desactivá o reactivá las cuentas del personal"
            />
          </li>
        </ul>
      </section>
    </section>
  );
}
