import Link from "next/link";
import { Briefcase, ChevronRight, UserSearch } from "lucide-react";
import { CarruselOfertas } from "@/components/public/carrusel-ofertas";
import { TarjetaOferta } from "@/components/ofertas/tarjeta-oferta";
import { Badge } from "@/components/ui/badge";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { Esqueleto, EsqueletoTarjeta } from "@/components/ui/esqueleto";
import { ultimasOfertasPublicas } from "@/lib/ofertas";
import { formatAntiguedadPublicacion } from "@/lib/fechas";
import { rutaBuscarPostulantes } from "@/lib/invitaciones";
import { obtenerInvitacionesPendientes } from "@/lib/postulante/panel";

const TITULO = "Últimas ofertas";
const BAJADA = "Todas pasan por la revisión de la Oficina de Empleo antes de publicarse.";

const ENLACE = (
  <Link
    href="/ofertas"
    className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-md)] text-[15px] font-bold whitespace-nowrap text-primary outline-none hover:underline focus-visible:shadow-[var(--sombra-foco)]"
  >
    Ver todas las ofertas
    <ChevronRight className="size-4" aria-hidden="true" />
  </Link>
);

/**
 * Carrusel con las últimas ofertas activas y vigentes. La oficina ve además
 * "Buscar postulantes" en cada una; el postulante, "Te invitaron" en las que
 * tiene una invitación pendiente.
 */
export async function UltimasOfertas({
  esOficina,
  esPostulante,
}: {
  esOficina: boolean;
  esPostulante: boolean;
}) {
  const [resultado, invitaciones] = await Promise.all([
    ultimasOfertasPublicas(),
    esPostulante ? obtenerInvitacionesPendientes() : null,
  ]);
  // Sin las invitaciones las tarjetas se muestran igual, sin la marca.
  const invitadas = new Set((invitaciones?.data ?? []).map((i) => i.oferta_id));

  if (!resultado.ok) {
    return (
      <EncabezadoSinCarrusel>
        <ErrorListado
          className="mt-6"
          mensaje="No pudimos cargar las ofertas. Intentá de nuevo en unos minutos."
          refError={resultado.refError}
        />
      </EncabezadoSinCarrusel>
    );
  }

  if (resultado.ofertas.length === 0) {
    return (
      <EncabezadoSinCarrusel>
        <EstadoVacio
          tipo="sin-registros"
          className="mt-6"
          icono={Briefcase}
          titulo="Todavía no hay ofertas publicadas"
          descripcion="Cuando las empresas de la ciudad publiquen búsquedas, van a aparecer en este espacio."
        />
      </EncabezadoSinCarrusel>
    );
  }

  const ahora = new Date();

  return (
    <CarruselOfertas titulo={TITULO} bajada={BAJADA} enlace={ENLACE}>
      {resultado.ofertas.map((oferta) => (
        <TarjetaOferta
          key={oferta.id}
          href={`/ofertas/${oferta.id}`}
          titulo={oferta.titulo}
          empresa={oferta.empresa}
          rubros={oferta.categorias}
          modalidad={oferta.modalidad}
          lugar={oferta.ubicacion}
          jornada={oferta.jornada}
          publicada={formatAntiguedadPublicacion(oferta.fechaPublicacion, ahora)}
          badges={invitadas.has(oferta.id) && <Badge tono="warning">Te invitaron</Badge>}
          accionExtra={
            esOficina && (
              <Link
                href={rutaBuscarPostulantes(oferta.id, { volver: "/" })}
                className="btn-primario"
              >
                <UserSearch aria-hidden="true" />
                Buscar postulantes
              </Link>
            )
          }
        />
      ))}
    </CarruselOfertas>
  );
}

function EncabezadoSinCarrusel({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="ultimas-ofertas-titulo">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="ultimas-ofertas-titulo" className="text-[26px] leading-tight font-extrabold">
            {TITULO}
          </h2>
          <p className="mt-1.5 text-base text-muted-foreground">{BAJADA}</p>
        </div>
        {ENLACE}
      </div>
      {children}
    </section>
  );
}

export function EsqueletoUltimasOfertas() {
  return (
    <div aria-busy="true" aria-label="Cargando las últimas ofertas" className="@container">
      <Esqueleto className="h-8 w-56" />
      <Esqueleto className="mt-2 h-4 w-3/4 sm:w-96" />
      <div className="mt-6 grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <EsqueletoTarjeta
            key={i}
            className={i === 1 ? "hidden @xl:block" : i === 2 ? "hidden @4xl:block" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
