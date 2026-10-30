import { AvatarAjustado } from "@/components/ui/avatar-ajustado";

/**
 * Resumen de los diálogos de la ficha: las iniciales del postulante, su
 * nombre y "{oferta} · {empresa}". La página lo arma una vez y lo pasa a las
 * acciones y a la pre-entrevista, que lo muestran dentro de DialogResumen.
 */
export function ResumenPostulacion({
  nombre,
  iniciales,
  oferta,
  empresa,
}: {
  nombre: string;
  iniciales?: string;
  oferta: string | null;
  empresa: string | null;
}) {
  const detalle = [oferta, empresa].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3">
      <AvatarAjustado iniciales={iniciales} alt="" size="lista" />
      <div className="min-w-0">
        <p className="font-bold break-words text-heading">{nombre}</p>
        {detalle && <p className="mt-0.5 text-sm break-words text-muted-foreground">{detalle}</p>}
      </div>
    </div>
  );
}
