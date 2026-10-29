import {
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  HardHat,
  HeartPulse,
  Monitor,
  ShoppingBag,
  Shield,
  Truck,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Un ícono por rubro de la tabla categorias, por nombre. Un rubro nuevo sin
// entrada usa ICONO_RUBRO_POR_DEFECTO hasta que se agregue acá.
const ICONOS_RUBRO: Record<string, LucideIcon> = {
  "Administración": FileText,
  "Comercio y Ventas": ShoppingBag,
  "Construcción": HardHat,
  "Educación": GraduationCap,
  "Gastronomía": UtensilsCrossed,
  "Informática y Tecnología": Monitor,
  "Logística y Transporte": Truck,
  "Salud": HeartPulse,
  "Seguridad": Shield,
  "Servicios Generales": Wrench,
};

export const ICONO_RUBRO_POR_DEFECTO: LucideIcon = BriefcaseBusiness;

export function iconoRubro(nombre: string): LucideIcon {
  return ICONOS_RUBRO[nombre] ?? ICONO_RUBRO_POR_DEFECTO;
}
