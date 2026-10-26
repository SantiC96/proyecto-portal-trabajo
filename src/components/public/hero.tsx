import { Briefcase, Building, Search, UserPlus } from "lucide-react";
import { BuscadorInicio } from "@/components/public/buscador-inicio";

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

// Decorativos, solo en escritorio: van a la derecha del texto (ver .hero-iconos).
const ICONOS_FLOTANTES = [UserPlus, Briefcase, Building, Search];

/** Bloque principal del inicio: textos y buscador de ofertas (el rubro se elige en el buscador). */
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
      className="hero-inicio flex flex-col gap-6 rounded-3xl border p-6 sm:px-14 sm:pt-14 sm:pb-12"
    >
      <div className="hero-deco" aria-hidden="true">
        <div className="hero-brillo" />
        <div className="hero-anillo" />
        <div className="hero-iconos">
          {ICONOS_FLOTANTES.map((Icono, i) => (
            <span key={i} className="hero-icono">
              <Icono />
            </span>
          ))}
        </div>
      </div>

      <div className="flex max-w-[720px] flex-col gap-4">
        <p className="text-[13px] font-bold tracking-[0.08em] text-sidebar-texto uppercase">
          {textos.volanta}
        </p>
        <h1
          id="inicio-titulo"
          className="titulo-portada text-[32px] leading-[1.08] text-white sm:text-[46px]"
        >
          {textos.titulo}
        </h1>
        <p className="text-lg leading-[1.55] text-sidebar-texto">{textos.bajada}</p>
      </div>

      <BuscadorInicio categorias={categorias} />
    </section>
  );
}
