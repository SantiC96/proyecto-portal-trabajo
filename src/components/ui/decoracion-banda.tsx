import Image from "next/image";

/**
 * Anillo y escudo blanco de las bandas verdes (listado de ofertas y
 * encabezado del postulante). Capa propia que recorta sin cortar lo que salga
 * de la banda; va detrás del contenido y no recibe clics.
 */
export function DecoracionBanda() {
  return (
    <div className="banda-ofertas-deco" aria-hidden="true">
      <div className="banda-ofertas-anillo" />
      <Image
        src="/images/escudo-blanco.png"
        alt=""
        width={330}
        height={344}
        className="banda-ofertas-escudo"
      />
    </div>
  );
}
