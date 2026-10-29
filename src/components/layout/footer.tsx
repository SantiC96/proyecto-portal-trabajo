import Image from "next/image";
import Link from "next/link";
import { ChevronUp, Clock, Mail, MapPin, Phone } from "lucide-react";
import { rutaPanel } from "@/components/layout/secciones-rol";
import { OFICINA } from "@/lib/oficina";
import type { SesionData } from "@/lib/sesion";

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
    <h2 id={id} className="pie-titulo">
      {children}
    </h2>
  );
}

/**
 * Vuelve al inicio de la página (sin animación con prefers-reduced-motion) y
 * deja el foco en el <main>, para que el teclado siga desde arriba.
 */
function volverArriba() {
  const sinAnimacion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: sinAnimacion ? "instant" : "smooth" });
  const destino =
    document.querySelector<HTMLElement>(".app-pagina main") ??
    document.querySelector<HTMLElement>(".app-pagina");
  if (!destino) return;
  if (!destino.hasAttribute("tabindex")) destino.setAttribute("tabindex", "-1");
  destino.focus({ preventScroll: true });
}

/**
 * Pie de todas las pantallas con navegación (públicas y con sesión), debajo
 * de .app-pagina y a todo el ancho del contenido. En /auth no se muestra
 * (AppShell).
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
    <footer className="pie-portal">
      <Image
        src="/images/escudo-blanco.png"
        alt=""
        aria-hidden="true"
        width={330}
        height={344}
        className="pie-escudo"
      />

      <div className="pie-columnas">
        <div className="flex flex-col items-start">
          <Image
            src="/images/logo-funes-blanco.png"
            alt="Municipalidad de Funes"
            width={185}
            height={52}
            className="pie-logo"
          />
          <p className="mt-4 text-xs font-extrabold tracking-[0.1em] text-sidebar-suave">PORTAL DE EMPLEO</p>
          <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-sidebar-texto">
            Ofertas de empresas de la ciudad, revisadas por la Oficina de Empleo.
          </p>
          <ul className="mt-5 flex gap-3" aria-label="Redes sociales">
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
        </div>

        <nav aria-labelledby="pie-portal-titulo">
          <TituloColumna id="pie-portal-titulo">Portal</TituloColumna>
          <ul className="mt-3 flex flex-col items-start">
            <li>
              <Link href="/ofertas" className="pie-link">
                Ofertas de trabajo
              </Link>
            </li>
            <li>
              <Link href="/#como-funciona" className="pie-link">
                Cómo funciona
              </Link>
            </li>
            <li>
              <Link href="/preguntas-frecuentes" className="pie-link">
                Preguntas frecuentes
              </Link>
            </li>
            {sesion ? (
              <li>
                <Link href={rutaPanel(sesion.rol)} className="pie-link">
                  Mi panel
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link href="/auth/login" className="pie-link">
                    Ingresar
                  </Link>
                </li>
                <li>
                  <button type="button" onClick={onRegistrarme} className="pie-link">
                    Crear cuenta
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

        <section aria-labelledby="pie-oficina-titulo">
          <TituloColumna id="pie-oficina-titulo">{OFICINA.nombre}</TituloColumna>
          <ul className="mt-3 flex flex-col items-start">
            <li>
              <a href={OFICINA.direccion.href} target="_blank" rel="noopener noreferrer" className="pie-dato">
                <MapPin aria-hidden="true" />
                <span className="min-w-0 break-words">
                  {OFICINA.direccion.texto}
                  <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
                </span>
              </a>
            </li>
            <li>
              <a href={OFICINA.telefono.href} className="pie-dato">
                <Phone aria-hidden="true" />
                <span className="min-w-0 break-words">{OFICINA.telefono.texto}</span>
              </a>
            </li>
            <li>
              <a href={OFICINA.correo.href} className="pie-dato">
                <Mail aria-hidden="true" />
                <span className="min-w-0 break-words">{OFICINA.correo.texto}</span>
              </a>
            </li>
            <li className="pie-dato">
              <Clock aria-hidden="true" />
              <span className="min-w-0 break-words">{OFICINA.horario.texto}</span>
            </li>
          </ul>
        </section>
      </div>

      <div className="pie-barra">
        <p className="text-sm text-sidebar-suave">© 2026 Municipalidad de Funes · Santa Fe</p>
        <button type="button" onClick={volverArriba} className="pie-arriba">
          <ChevronUp className="size-[18px]" aria-hidden="true" />
          Volver arriba
        </button>
      </div>
    </footer>
  );
}
