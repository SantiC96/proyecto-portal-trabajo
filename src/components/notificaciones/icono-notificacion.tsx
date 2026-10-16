import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Send,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EstiloTipo = { Icono: LucideIcon; className: string };

const EXITO = "bg-emerald-100 text-emerald-800";
const ADVERTENCIA = "bg-amber-100 text-amber-800";
const INFO = "bg-blue-100 text-blue-800";
const ERROR = "bg-red-100 text-red-700";
const NEUTRO = "bg-gray-100 text-gray-600";
const MARCA = "bg-secondary text-primary";

// Tipos del CHECK notificaciones_tipo_check (migration_041 y 043).
const ESTILO_POR_TIPO: Record<string, EstiloTipo> = {
  // Oficina
  contratacion: { Icono: BadgeCheck, className: EXITO },
  empresa_pendiente: { Icono: Building2, className: ADVERTENCIA },
  oferta_pendiente: { Icono: FileText, className: ADVERTENCIA },
  curso_completado: { Icono: GraduationCap, className: EXITO },
  postulacion_nueva: { Icono: ClipboardList, className: MARCA },
  necesita_curso: { Icono: BookOpen, className: ADVERTENCIA },
  // Postulante
  postulacion_derivada: { Icono: Send, className: MARCA },
  entrevista: { Icono: CalendarClock, className: INFO },
  seleccionado: { Icono: CheckCircle2, className: EXITO },
  no_seleccionado_empresa: { Icono: XCircle, className: NEUTRO },
  no_seleccionado_oficina: { Icono: XCircle, className: NEUTRO },
  curso_asignado: { Icono: BookOpen, className: INFO },
  // Empresa
  solicitud_aprobada: { Icono: BadgeCheck, className: EXITO },
  solicitud_rechazada: { Icono: XCircle, className: ERROR },
  oferta_aprobada: { Icono: CheckCircle2, className: EXITO },
  oferta_rechazada: { Icono: XCircle, className: ERROR },
  candidato_derivado: { Icono: UserPlus, className: MARCA },
  oferta_por_vencer: { Icono: Clock, className: ADVERTENCIA },
  oferta_vencida: { Icono: AlertTriangle, className: ERROR },
};

const ESTILO_POR_DEFECTO: EstiloTipo = { Icono: Bell, className: NEUTRO };

export function IconoNotificacion({ tipo, className }: { tipo: string; className?: string }) {
  const { Icono, className: color } = ESTILO_POR_TIPO[tipo] ?? ESTILO_POR_DEFECTO;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        color,
        className,
      )}
    >
      <Icono className="h-4 w-4" />
    </span>
  );
}
