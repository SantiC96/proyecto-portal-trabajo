import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  House,
  FileText,
  GraduationCap,
  Mail,
  Send,
  ThumbsDown,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { claseTono } from "@/components/ui/badge";

type EstiloTipo = { Icono: LucideIcon; className: string };

// Mismos tonos sólidos que los badges de estado.
const EXITO = claseTono("success");
const ADVERTENCIA = claseTono("warning");
const INFO = claseTono("info");
const ERROR = claseTono("danger");
const NEUTRO = claseTono("neutral");
const MARCA = "bg-primary text-primary-foreground";

// Tipos del CHECK notificaciones_tipo_check (migration_041, 043, 044, 051, 053, 055 y 056).
const ESTILO_POR_TIPO: Record<string, EstiloTipo> = {
  // Oficina
  contratacion: { Icono: BadgeCheck, className: EXITO },
  empresa_pendiente: { Icono: Building2, className: ADVERTENCIA },
  oferta_pendiente: { Icono: FileText, className: ADVERTENCIA },
  curso_completado: { Icono: GraduationCap, className: EXITO },
  postulacion_nueva: { Icono: ClipboardList, className: MARCA },
  necesita_curso: { Icono: BookOpen, className: ADVERTENCIA },
  oferta_retirada: { Icono: Archive, className: NEUTRO },
  postulacion_retirada: { Icono: UserMinus, className: NEUTRO },
  comprobante_pendiente: { Icono: House, className: ADVERTENCIA },
  invitacion_aceptada: { Icono: UserPlus, className: EXITO },
  invitacion_rechazada: { Icono: ThumbsDown, className: NEUTRO },
  // Postulante
  postulacion_derivada: { Icono: Send, className: MARCA },
  entrevista: { Icono: CalendarClock, className: INFO },
  seleccionado: { Icono: CheckCircle2, className: EXITO },
  no_seleccionado_empresa: { Icono: XCircle, className: NEUTRO },
  no_seleccionado_oficina: { Icono: XCircle, className: NEUTRO },
  curso_asignado: { Icono: BookOpen, className: INFO },
  pre_entrevista_coordinada: { Icono: CalendarClock, className: INFO },
  pre_entrevista_reprogramada: { Icono: CalendarClock, className: INFO },
  postulacion_cerrada: { Icono: Archive, className: NEUTRO },
  comprobante_aprobado: { Icono: BadgeCheck, className: EXITO },
  comprobante_rechazado: { Icono: XCircle, className: ERROR },
  invitacion_oferta: { Icono: Mail, className: MARCA },
  // Empresa
  solicitud_aprobada: { Icono: BadgeCheck, className: EXITO },
  solicitud_rechazada: { Icono: XCircle, className: ERROR },
  oferta_aprobada: { Icono: CheckCircle2, className: EXITO },
  oferta_rechazada: { Icono: XCircle, className: ERROR },
  candidato_derivado: { Icono: UserPlus, className: MARCA },
  oferta_por_vencer: { Icono: Clock, className: ADVERTENCIA },
  oferta_vencida: { Icono: AlertTriangle, className: ERROR },
  candidato_retirado: { Icono: UserMinus, className: NEUTRO },
};

const ESTILO_POR_DEFECTO: EstiloTipo = { Icono: Bell, className: NEUTRO };

/** El ícono del tipo, sin su color (la lista del postulante usa sus propios colores). */
export function iconoTipoNotificacion(tipo: string): LucideIcon {
  return (ESTILO_POR_TIPO[tipo] ?? ESTILO_POR_DEFECTO).Icono;
}

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
