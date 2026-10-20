import {
  Bell,
  BookOpen,
  Bookmark,
  Briefcase,
  Building2,
  ChartColumn,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Rol } from "@/types/db";

export type SeccionRol = {
  label: string;
  href: string;
  Icono: LucideIcon;
};

/**
 * Secciones del panel de cada rol, en el orden en que aparecen en el menú del
 * usuario. "Mi perfil" va primero en los tres roles.
 */
export function seccionesDeRol(rol: Rol | null | undefined): SeccionRol[] {
  if (rol === "empresa") {
    return [
      { label: "Mi perfil", href: "/empresa/perfil", Icono: User },
      { label: "Panel", href: "/empresa", Icono: LayoutDashboard },
      { label: "Mis ofertas", href: "/empresa/ofertas", Icono: Briefcase },
      { label: "Publicar oferta", href: "/empresa/ofertas/nueva", Icono: FilePlus2 },
      { label: "Candidatos guardados", href: "/empresa/candidatos-guardados", Icono: Bookmark },
      { label: "Indicadores", href: "/empresa/indicadores", Icono: ChartColumn },
      { label: "Notificaciones", href: "/empresa/notificaciones", Icono: Bell },
    ];
  }
  if (rol === "municipalidad") {
    return [
      { label: "Mi perfil", href: "/admin/perfil", Icono: User },
      { label: "Panel", href: "/admin", Icono: LayoutDashboard },
      { label: "Ofertas", href: "/admin/ofertas", Icono: Briefcase },
      { label: "Empresas", href: "/admin/empresas", Icono: Building2 },
      { label: "Postulaciones", href: "/admin/postulaciones", Icono: ClipboardList },
      { label: "Postulantes", href: "/admin/postulantes", Icono: Users },
      { label: "Cursos", href: "/admin/cursos", Icono: BookOpen },
      { label: "Indicadores", href: "/admin/indicadores", Icono: ChartColumn },
      { label: "Cuentas de la oficina", href: "/admin/cuentas", Icono: UserCog },
      { label: "Notificaciones", href: "/admin/notificaciones", Icono: Bell },
    ];
  }
  return [
    { label: "Mi perfil", href: "/perfil", Icono: User },
    { label: "Mis postulaciones", href: "/mis-postulaciones", Icono: Briefcase },
    { label: "Mis cursos", href: "/mis-cursos", Icono: BookOpen },
    { label: "Notificaciones", href: "/notificaciones", Icono: Bell },
  ];
}

/**
 * href de la sección en la que está el usuario: la de prefijo más largo, así
 * en /empresa/ofertas/nueva queda marcada "Publicar oferta" y no "Mis ofertas".
 */
export function seccionActual(secciones: SeccionRol[], pathname: string): string | null {
  let actual: string | null = null;
  for (const { href } of secciones) {
    const coincide = pathname === href || pathname.startsWith(`${href}/`);
    if (coincide && (!actual || href.length > actual.length)) actual = href;
  }
  return actual;
}
