import { Esqueleto, EsqueletoEnLinea } from "@/components/ui/esqueleto";

/**
 * Mi perfil de la empresa y de la oficina mientras carga: la tarjeta de la
 * foto, las dos tarjetas de la misma altura (desde lg) y la contraseña.
 */
export function PerfilCuentaEsqueleto({
  subtitulo,
  izquierda,
  derecha,
}: {
  subtitulo?: string;
  izquierda: string;
  derecha: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPerfilEsqueleto subtitulo={subtitulo} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:items-stretch lg:*:h-full">
        <SeccionPerfilEsqueleto titulo={izquierda} datos={4} />
        <SeccionPerfilEsqueleto titulo={derecha} datos={4} />
      </div>
      <SeccionPerfilEsqueleto titulo="Contraseña" datos={1} />
    </div>
  );
}

/**
 * La tarjeta de la foto de Mi perfil (EncabezadoPerfil `destacado`) mientras
 * carga: el círculo de 76/96 px, el nombre y los botones en gris. El
 * subtítulo va real si es fijo ("Postulante", "Oficina de Empleo").
 */
export function EncabezadoPerfilEsqueleto({ subtitulo }: { subtitulo?: string }) {
  return (
    <div aria-hidden="true" className="tarjeta tarjeta-panel flex flex-col gap-5">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
        <Esqueleto className="size-[76px] shrink-0 rounded-full sm:size-24" />
        <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <Esqueleto className="my-1 h-[26px] w-56 max-w-full sm:h-8" />
            {subtitulo ? (
              <p className="text-[15px] font-semibold text-primary">{subtitulo}</p>
            ) : (
              <Esqueleto className="h-4 w-28" />
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Esqueleto className="h-11 w-36 rounded-[var(--radius-md)]" />
            <Esqueleto className="h-11 w-28 rounded-[var(--radius-md)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Una tarjeta del perfil (SeccionPerfil) mientras carga: el ícono de 40 px, el
 * título real y los datos (rótulo y valor) en gris, en dos columnas desde sm.
 */
export function SeccionPerfilEsqueleto({
  titulo,
  datos = 4,
  className,
}: {
  titulo: string;
  datos?: number;
  className?: string;
}) {
  return (
    <div className={`tarjeta flex flex-col gap-5 px-4 py-[18px] sm:p-6 ${className ?? ""}`}>
      <div className="flex min-w-0 items-center gap-3">
        <Esqueleto className="size-10 shrink-0 rounded-[11px]" />
        <p className="text-lg font-extrabold text-heading sm:text-xl">{titulo}</p>
      </div>
      <div aria-hidden="true" className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: datos }, (_, i) => (
          // Renglones con la letra de CampoLectura (estiloPerfil): 13 px y 16 px.
          <div key={i} className="flex min-w-0 flex-col gap-1">
            <p className="text-[13px] leading-[1.4]">
              <EsqueletoEnLinea className="w-24" />
            </p>
            <p className="text-base leading-[1.45]">
              <EsqueletoEnLinea className="w-3/4" />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
