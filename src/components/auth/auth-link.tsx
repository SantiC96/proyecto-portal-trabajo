"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSesion } from "@/components/layout/sesion-provider";
import { SesionActivaModal } from "@/components/auth/sesion-activa-modal";

interface Props {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

type SesionVerificada =
  | { activa: true; nombre: string; rol: string | null; profileHref: string }
  | { activa: false };

type ModalData = { nombre: string; rol: string | null; profileHref: string };

function getAccion(href: string): "registro" | "login" {
  return href.startsWith("/auth/login") ? "login" : "registro";
}

export function AuthLink({ href, className, children, onClick }: Props) {
  const sesion = useSesion();
  const router = useRouter();
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [consultando, setConsultando] = useState(false);
  const accion = getAccion(href);

  if (!sesion) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (consultando) return;
    onClick?.();
    setConsultando(true);
    try {
      const res = await fetch("/api/sesion", { cache: "no-store" });
      const data: SesionVerificada = await res.json();
      if (data.activa) {
        setModalData({ nombre: data.nombre, rol: data.rol, profileHref: data.profileHref });
      } else {
        router.refresh();
        router.push(href);
      }
    } catch {
      router.push(href);
    } finally {
      setConsultando(false);
    }
  }

  return (
    <>
      <a
        href={href}
        className={className}
        aria-busy={consultando || undefined}
        onClick={handleClick}
      >
        {children}
      </a>
      {modalData && (
        <SesionActivaModal
          nombre={modalData.nombre}
          rol={modalData.rol}
          redirectTo={href}
          accion={accion}
          profileHref={modalData.profileHref}
          onClose={() => setModalData(null)}
        />
      )}
    </>
  );
}
