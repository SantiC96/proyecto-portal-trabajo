import Link from "next/link";
import { BuscadorInicio } from "@/components/public/buscador-inicio";
import { hrefConParams } from "@/lib/paginacion";

type Props = {
  /** Solo el postulante con sesión ve el saludo y los textos para él. */
  nombrePostulante: string | null;
  categorias: string[];
};

const TEXTOS_GENERALES = {
  volanta: "Portal de empleo · Ciudad de Funes",
  titulo: "Trabajo en Funes, cerca de tu casa.",
  bajada:
    "Ofertas de empresas de la ciudad, revisadas por la Oficina de Empleo. Cargá tu perfil una vez y postulate sin llevar el CV impreso.",
};

/** Bloque principal del inicio: textos, buscador de ofertas y rubros. */
export function Hero({ nombrePostulante, categorias }: Props) {
  const textos =
    nombrePostulante !== null
      ? {
          volanta: nombrePostulante ? `Hola, ${nombrePostulante}` : "Hola",
          titulo: "Encontrá tu próximo trabajo en Funes.",
          bajada:
            "Buscá entre las ofertas aprobadas por la Oficina de Empleo y postulate con tu perfil.",
        }
      : TEXTOS_GENERALES;

  return (
    <section
      aria-labelledby="inicio-titulo"
      className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-6 sm:px-14 sm:pt-14 sm:pb-12"
    >
      <div className="flex max-w-[720px] flex-col gap-4">
        <p className="text-[13px] font-bold tracking-[0.08em] text-primary-hover uppercase">
          {textos.volanta}
        </p>
        <h1
          id="inicio-titulo"
          className="text-[32px] leading-[1.08] font-extrabold tracking-[-0.02em] text-heading sm:text-[46px]"
        >
          {textos.titulo}
        </h1>
        <p className="text-lg leading-[1.55] text-texto-bajada">{textos.bajada}</p>
      </div>

      <BuscadorInicio categorias={categorias} />

      {categorias.length > 0 && (
        <nav aria-label="Rubros" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-semibold text-muted-foreground-strong">Rubros:</span>
          {categorias.map((c) => (
            <Link
              key={c}
              href={hrefConParams("/ofertas", {}, { categoria: c })}
              // 36 px de alto; el área táctil llega a 44 px con el margen
              // vertical invisible del ::before.
              className="relative inline-flex h-9 items-center rounded-[18px] border border-border-tab bg-surface px-3.5 text-sm font-semibold text-control-foreground outline-none transition-colors before:absolute before:-inset-y-1 before:inset-x-0 hover:border-primary hover:text-primary focus-visible:shadow-[var(--sombra-foco)]"
            >
              {c}
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
