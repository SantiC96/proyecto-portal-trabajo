"use client";

import { useRouter } from "next/navigation";
import { retirarOferta } from "@/app/empresa/(panel)/ofertas/actions";
import { DialogoConfirmacion } from "@/components/ui/dialogo-confirmacion";

interface Props {
  ofertaId: string;
  ofertaTitulo: string;
  /** Postulaciones que la oficina todavía no derivó. */
  postulacionesOficina: number;
  /** Candidatos derivados sin resultado (por contactar o con entrevista). */
  candidatosDerivados: number;
  /** Adónde ir después de la baja; sin valor, se refresca la página actual. */
  volverA?: string;
}

/**
 * Único diálogo de "Retirar oferta": lo usan Mis ofertas y el detalle de la
 * oferta (a través de BajaOfertaBtn).
 */
const TEXTO_RETIRO = {
  boton: "Retirar oferta",
  ayuda: "La oferta queda cerrada y no se puede reabrir.",
  titulo: "¿Retirar esta oferta?",
  descripcion: (titulo: string) =>
    `La oferta "${titulo}" quedará cerrada: dejará de verse en el portal y en la revisión de la Oficina de Empleo, y no se podrá reabrir.`,
  candidatos: (total: number) =>
    total === 1 ? "Hay 1 candidato en proceso." : `Hay ${total} candidatos en proceso.`,
} as const;

export function RetirarOfertaBtn({ ofertaId, ofertaTitulo, postulacionesOficina, candidatosDerivados, volverA }: Props) {
  const router = useRouter();
  const total = postulacionesOficina + candidatosDerivados;

  return (
    <DialogoConfirmacion
      textoBoton={TEXTO_RETIRO.boton}
      estiloBoton="peligro"
      claseBoton="px-3 text-xs sm:min-h-9"
      ayudaBoton={TEXTO_RETIRO.ayuda}
      titulo={TEXTO_RETIRO.titulo}
      descripcion={TEXTO_RETIRO.descripcion(ofertaTitulo)}
      textoConfirmar={TEXTO_RETIRO.boton}
      textoPendiente="Retirando…"
      destructivo
      accion={() => retirarOferta(ofertaId)}
      onExito={() => (volverA ? router.push(volverA) : router.refresh())}
    >
      {total > 0 && <p className="text-sm text-muted-foreground">{TEXTO_RETIRO.candidatos(total)}</p>}
    </DialogoConfirmacion>
  );
}
