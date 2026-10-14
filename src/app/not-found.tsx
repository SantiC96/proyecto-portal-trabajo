import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold text-foreground">
        No encontramos lo que buscabas
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        La página que intentás ver no existe o fue movida.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="btn-primario inline-flex h-10 items-center justify-center px-5 text-sm"
        >
          Ir al inicio
        </Link>
        <Link
          href="/ofertas"
          className="btn-secundario inline-flex h-10 items-center justify-center px-5 text-sm"
        >
          Ver ofertas
        </Link>
      </div>
    </div>
  );
}
