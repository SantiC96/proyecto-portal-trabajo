import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  ChartColumn,
  CirclePlus,
  FileCheck,
  FileText,
  Globe,
  GraduationCap,
  House,
  LayoutDashboard,
  Mail,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Rol } from "@/types/db";
import type { PendientesOficina } from "@/lib/admin/pendientes";

export type ClaveContador = keyof PendientesOficina;

export type SeccionRol = {
  label: string;
  href: string;
  Icono: LucideIcon;
  /** Título del grupo (solo oficina). Se muestra al empezar cada grupo. */
  grupo?: string;
  /** "destacada": la acción principal del rol (Publicar oferta). */
  variante?: "destacada";
  /** Pendientes de trabajo que se cuentan en la sección (solo oficina). */
  contador?: ClaveContador;
  /** Línea separadora antes de la sección. */
  separadorAntes?: boolean;
};

const INICIO: SeccionRol = { label: "Inicio", href: "/", Icono: House };
const OFERTAS: SeccionRol = { label: "Ofertas", href: "/ofertas", Icono: Briefcase };

/** Secciones de la navegación lateral de cada rol, en orden. */
export function seccionesDeRol(rol: Rol | null | undefined, conSesion: boolean): SeccionRol[] {
  if (!conSesion) return [INICIO, OFERTAS];

  if (rol === "empresa") {
    return [
      INICIO,
      { label: "Panel", href: "/empresa", Icono: LayoutDashboard },
      { label: "Mis ofertas", href: "/empresa/ofertas", Icono: Briefcase },
      {
        label: "Publicar oferta",
        href: "/empresa/ofertas/nueva",
        Icono: CirclePlus,
        variante: "destacada",
      },
      { label: "Candidatos guardados", href: "/empresa/candidatos-guardados", Icono: Bookmark },
      { label: "Indicadores", href: "/empresa/indicadores", Icono: ChartColumn },
      { label: "Ofertas del portal", href: "/ofertas", Icono: Globe },
      { label: "Notificaciones", href: "/empresa/notificaciones", Icono: Bell },
    ];
  }

  if (rol === "municipalidad") {
    return [
      INICIO,
      { label: "Panel", href: "/admin", Icono: LayoutDashboard },
      { label: "Ofertas", href: "/admin/ofertas", Icono: Briefcase, grupo: "Gestión", contador: "ofertas" },
      { label: "Empresas", href: "/admin/empresas", Icono: Building2, grupo: "Gestión", contador: "empresas" },
      { label: "Postulaciones", href: "/admin/postulaciones", Icono: FileText, grupo: "Gestión" },
      { label: "Postulantes", href: "/admin/postulantes", Icono: Users, grupo: "Gestión" },
      {
        label: "Comprobantes",
        href: "/admin/comprobantes",
        Icono: FileCheck,
        grupo: "Gestión",
        contador: "comprobantes",
      },
      { label: "Cursos", href: "/admin/cursos", Icono: GraduationCap, grupo: "Formación" },
      { label: "Indicadores", href: "/admin/indicadores", Icono: ChartColumn, grupo: "Reportes" },
      { label: "Cuentas de la oficina", href: "/admin/cuentas", Icono: UserCog, grupo: "Administración" },
      { label: "Notificaciones", href: "/admin/notificaciones", Icono: Bell, separadorAntes: true },
    ];
  }

  return [
    INICIO,
    { label: "Panel", href: "/panel", Icono: LayoutDashboard },
    OFERTAS,
    { label: "Mis postulaciones", href: "/mis-postulaciones", Icono: FileText },
    { label: "Invitaciones", href: "/invitaciones", Icono: Mail },
    { label: "Mis cursos", href: "/mis-cursos", Icono: GraduationCap },
    { label: "Notificaciones", href: "/notificaciones", Icono: Bell },
  ];
}

/** "Mi perfil" de cada rol: va en el menú del usuario, no en la lista. */
export function rutaPerfil(rol: Rol | null | undefined): string {
  if (rol === "empresa") return "/empresa/perfil";
  if (rol === "municipalidad") return "/admin/perfil";
  return "/perfil";
}

export function etiquetaRol(rol?: Rol | null): string {
  if (rol === "empresa") return "Empresa";
  if (rol === "municipalidad") return "Oficina de empleo";
  return "Postulante";
}

/**
 * href de la sección en la que está el usuario: coincidencia exacta o por
 * prefijo, la más larga gana. Así /admin/ofertas/123 marca "Ofertas" y no
 * "Panel", y /empresa/ofertas/nueva marca "Publicar oferta". "/" solo
 * coincide exacto.
 */
export function seccionActual(secciones: SeccionRol[], pathname: string): string | null {
  let actual: string | null = null;
  for (const { href } of secciones) {
    const coincide = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    if (coincide && (!actual || href.length > actual.length)) actual = href;
  }
  return actual;
}

/** Texto del contador para el tooltip y el aria-label: "Comprobantes · 5 por revisar". */
export function textoConContador(label: string, cantidad: number | undefined): string {
  return cantidad ? `${label} · ${cantidad} por revisar` : label;
}
