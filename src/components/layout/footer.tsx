import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { rutaPanel } from "@/components/layout/secciones-rol";
import { OFICINA } from "@/lib/oficina";
import type { SesionData } from "@/lib/sesion";

const CLASE_LINK =
  "inline-flex min-h-11 items-center gap-2.5 rounded-[var(--radius-md)] text-left outline-none hover:text-white hover:underline focus-visible:shadow-[0_0_0_3px_rgb(255_255_255/0.6)]";

// lucide no trae íconos de marcas: trazos simples de 24 × 24.
function IconoInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function IconoFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z" />
    </svg>
  );
}

function TituloColumna({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-base leading-snug font-extrabold text-white">
      {children}
    </h2>
  );
}

function DatoOficina({ Icono, children }: { Icono: LucideIcon; children: React.ReactNode }) {
  return (
    <>
      <Icono className="size-[18px] shrink-0 text-white" aria-hidden="true" />
      <span className="min-w-0 break-words">{children}</span>
    </>
  );
}

/**
 * Pie de todas las pantallas con navegación (públicas y con sesión), al final
 * del contenido y a todo su ancho. En /auth no se muestra (AppShell).
 */
export function Footer({
  sesion,
  onRegistrarme,
}: {
  sesion: SesionData | null;
  onRegistrarme: () => void;
}) {
  const redes = [
    { ...OFICINA.redes.instagram, Icono: IconoInstagram },
    { ...OFICINA.redes.facebook, Icono: IconoFacebook },
  ];

  return (
    <>
    <div className="pie-espacio" aria-hidden="true" />
    <footer className="pie-portal @container text-[15px] text-sidebar-texto">
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 @2xl:grid-cols-2 @4xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <div className="flex flex-col gap-3">
          <Image
            src="/images/logo-funes-blanco.png"
            alt="Municipalidad de Funes"
            width={170}
            height={48}
            className="h-auto w-[150px]"
          />
          <p className="font-bold text-white">Portal de Empleo de la Municipalidad de Funes</p>
          <p>Conectamos a vecinos de Funes con empresas de la ciudad.</p>
        </div>

        <section aria-labelledby="pie-oficina">
          <TituloColumna id="pie-oficina">{OFICINA.nombre}</TituloColumna>
          <ul className="mt-2 flex flex-col">
            <li>
              <a href={OFICINA.direccion.href} target="_blank" rel="noopener noreferrer" className={CLASE_LINK}>
                <DatoOficina Icono={MapPin}>
                  {OFICINA.direccion.texto}
                  <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
                </DatoOficina>
              </a>
            </li>
            <li className="flex min-h-11 items-center gap-2.5">
              <DatoOficina Icono={Clock}>{OFICINA.horario.texto}</DatoOficina>
            </li>
            <li>
              <a href={OFICINA.telefono.href} className={CLASE_LINK}>
                <DatoOficina Icono={Phone}>{OFICINA.telefono.texto}</DatoOficina>
              </a>
            </li>
            <li>
              <a href={OFICINA.correo.href} className={CLASE_LINK}>
                <DatoOficina Icono={Mail}>{OFICINA.correo.texto}</DatoOficina>
              </a>
            </li>
          </ul>
        </section>

        <section aria-labelledby="pie-redes">
          <TituloColumna id="pie-redes">Seguinos</TituloColumna>
          <ul className="mt-3 flex gap-3">
            {redes.map(({ texto, etiqueta, href, Icono }) => (
              <li key={texto}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={etiqueta}
                  className="pie-red"
                >
                  <Icono />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-labelledby="pie-enlaces">
          <TituloColumna id="pie-enlaces">Enlaces</TituloColumna>
          <ul className="mt-2 flex flex-col">
            <li>
              <Link href="/ofertas" className={CLASE_LINK}>
                Ofertas
              </Link>
            </li>
            <li>
              <Link href="/preguntas-frecuentes" className={CLASE_LINK}>
                Preguntas frecuentes
              </Link>
            </li>
            {sesion ? (
              <li>
                <Link href={rutaPanel(sesion.rol)} className={CLASE_LINK}>
                  Mi panel
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link href="/auth/login" className={CLASE_LINK}>
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <button type="button" onClick={onRegistrarme} className={CLASE_LINK}>
                    Registrarme
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>

      <p className="mt-8 border-t border-white/20 pt-6 text-sm">© 2026 Municipalidad de Funes</p>
    </footer>
    </>
  );
}
