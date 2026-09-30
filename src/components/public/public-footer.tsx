"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export function PublicFooter() {
  const pathname = usePathname();

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    // Solo intercepta el scroll si estamos en la home; si no, deja navegar a /#id
    if (pathname !== "/") return;
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <footer className="border-t border-[#d8ddd7] bg-white text-[#1b2926]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Brand & Municipal Info */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <Image
                src="/images/logo-funes-color.png"
                alt="Municipalidad de Funes"
                width={92}
                height={26}
                className="object-contain"
              />
            </div>
            <p className="mt-1 text-xs text-[#6e7772] leading-relaxed">
              Plataforma pública de intermediación laboral para vincular el talento de Funes con las
              oportunidades laborales del comercio y la industria local.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-[#1b2926] uppercase">
              Accesos rápidos
            </h4>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-[#4f5a54]">
              <li>
                <Link
                  href="/#ofertas"
                  onClick={(e) => handleScrollTo(e, "ofertas")}
                  className="hover:text-[#0f5b53] hover:underline"
                >
                  Ver ofertas vigentes
                </Link>
              </li>
              <li>
                <Link
                  href="/#como-funciona"
                  onClick={(e) => handleScrollTo(e, "como-funciona")}
                  className="hover:text-[#0f5b53] hover:underline"
                >
                  ¿Cómo funciona el portal?
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#0f5b53] hover:underline">
                  Iniciar sesión (Postulantes y Empresas)
                </Link>
              </li>
              <li>
                <Link href="/auth/registro" className="hover:text-[#0f5b53] hover:underline">
                  Registro para Postulantes
                </Link>
              </li>
              <li>
                <Link href="/auth/registro?tipo=empresa" className="hover:text-[#0f5b53] hover:underline">
                  Registro para Empresas
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Attention Office & In-person Registration */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-[#1b2926] uppercase">
              Atención Presencial
            </h4>
            <div className="mt-3 flex flex-col gap-2.5 text-xs text-[#4f5a54]">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 text-[#0f5b53] mt-0.5" />
                <span>Lunes a Viernes de 7:30 a 13:00 hs</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#0f5b53] mt-0.5" />
                <span>Oficina de Empleo, Municipalidad de Funes, Santa Fe</span>
              </div>
              <p className="mt-1 text-[11px] text-[#6e7772]">
                ℹ️ Si no podés registrarte online, podés acercarte personalmente a la oficina con tu DNI y CV para que el equipo cargue tu postulación.
              </p>
            </div>
          </div>

          {/* Col 4: Contact */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-[#1b2926] uppercase">
              Contacto y Consultas
            </h4>
            <div className="mt-3 flex flex-col gap-2 text-xs text-[#4f5a54]">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-[#0f5b53]" />
                <span>empleo@funes.gob.ar</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-[#0f5b53]" />
                <span>(0341) 493-6010</span>
              </div>
              <div className="mt-2 rounded-lg bg-[#f8f8f4] p-2.5 text-[11px] text-[#6e7772]">
                Servicio gratuito regulado por la Secretaría de Desarrollo Económico y Productivo de Funes.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[#d8ddd7]/60 pt-6 text-center text-xs text-[#6e7772] sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Municipalidad de Funes. Todos los derechos reservados.</p>
          <p className="text-[11px]">Portal de Intermediación y Empleo Local</p>
        </div>
      </div>
    </footer>
  );
}
