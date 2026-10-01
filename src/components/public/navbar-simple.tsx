"use client";

import Link from "next/link";
import Image from "next/image";

export function NavbarSimple() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="Portal de Empleo Funes - Inicio"
        >
          <Image
            src="/images/logo-funes-color.png"
            alt="Logo Municipalidad de Funes"
            width={92}
            height={26}
            className="object-contain"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
