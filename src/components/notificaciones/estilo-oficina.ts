import {
  Archive,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  FileText,
  MailCheck,
  Pencil,
  Receipt,
  RefreshCw,
  Undo2,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";

/** Ícono, fondo de su cuadrado y texto del link de una notificación de la oficina. */
export type EstiloNotificacionOficina = { icono: LucideIcon; fondo: string; enlace: string };

// Amarillo: lo que hay que revisar. El ícono va en accent-foreground (#2B2000).
const AMARILLO = "bg-accent text-accent-foreground";
const VERDE = "bg-success";
const AZUL = "bg-info";
const GRIS = "bg-neutral";
const ROJO = "bg-danger";

/**
 * Tipos de la oficina del CHECK notificaciones_tipo_check (migration_056).
 * El texto del link nombra adónde lleva (el link lo arma la base).
 */
export const ESTILO_OFICINA: Record<string, EstiloNotificacionOficina> = {
  empresa_pendiente: { icono: Building2, fondo: AMARILLO, enlace: "Revisar empresa" },
  comprobante_pendiente: { icono: Receipt, fondo: AMARILLO, enlace: "Revisar comprobante" },
  oferta_pendiente: { icono: Briefcase, fondo: AMARILLO, enlace: "Revisar oferta" },
  contratacion: { icono: Award, fondo: VERDE, enlace: "Ver postulación" },
  invitacion_aceptada: { icono: MailCheck, fondo: VERDE, enlace: "Ver postulación" },
  curso_completado: { icono: BookOpen, fondo: VERDE, enlace: "Ver postulante" },
  postulacion_nueva: { icono: FileText, fondo: AZUL, enlace: "Ver postulación" },
  postulacion_retirada: { icono: Undo2, fondo: GRIS, enlace: "Ver postulación" },
  oferta_retirada: { icono: Archive, fondo: GRIS, enlace: "Ver oferta" },
  invitacion_rechazada: { icono: X, fondo: ROJO, enlace: "Ver oferta" },
  necesita_curso: { icono: UserX, fondo: ROJO, enlace: "Ver postulante" },
};

// 'empresa_pendiente' y 'oferta_pendiente' también avisan un reenvío y una
// edición (migration_041/051): se distinguen por la clave y, en las filas sin
// clave, por el título.
const REENVIO_EMPRESA: EstiloNotificacionOficina = {
  icono: RefreshCw,
  fondo: AMARILLO,
  enlace: "Revisar empresa",
};
const OFERTA_EDITADA: EstiloNotificacionOficina = {
  icono: Pencil,
  fondo: AMARILLO,
  enlace: "Revisar oferta",
};

/** Texto del link según la ruta, para un tipo que no esté en el mapa. */
function enlacePorRuta(link: string | null | undefined): string {
  if (link?.startsWith("/admin/empresas")) return "Revisar empresa";
  if (link?.startsWith("/admin/comprobantes")) return "Revisar comprobante";
  if (link?.startsWith("/admin/ofertas")) return "Ver oferta";
  if (link?.startsWith("/admin/postulaciones")) return "Ver postulación";
  if (link?.startsWith("/admin/postulantes")) return "Ver postulante";
  if (link?.startsWith("/admin/cursos")) return "Ver curso";
  return "Ver detalle";
}

export function estiloNotificacionOficina(n: {
  tipo: string;
  titulo: string;
  link?: string | null;
  clave?: string | null;
}): EstiloNotificacionOficina {
  if (
    n.tipo === "empresa_pendiente" &&
    (n.clave?.startsWith("empresa_reenviada:") || (!n.clave && n.titulo === "Solicitud reenviada"))
  ) {
    return REENVIO_EMPRESA;
  }
  if (
    n.tipo === "oferta_pendiente" &&
    (n.clave?.startsWith("oferta_editada:") ||
      (!n.clave && n.titulo === "Oferta editada para revisar"))
  ) {
    return OFERTA_EDITADA;
  }
  return (
    ESTILO_OFICINA[n.tipo] ?? {
      icono: Bell,
      fondo: "bg-secondary text-neutral",
      enlace: enlacePorRuta(n.link),
    }
  );
}
