import { ExternalLink } from "lucide-react";

type Props = {
  email: string | null;
  dni: string | null;
  domicilio: string | null;
  telefono: string | null;
  categorias: { id: string; nombre: string }[];
  cvUrl: string | null;
};

export function DatosCandidato({
  email,
  dni,
  domicilio,
  telefono,
  categorias,
  cvUrl,
}: Props) {
  return (
    <>
      {/* Datos personales */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">Datos del candidato</h2>
        <dl className="mt-4 grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">DNI</dt>
            <dd className="mt-0.5 font-mono font-medium text-foreground">
              {dni ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Teléfono</dt>
            <dd className="mt-0.5 text-foreground">{telefono || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-0.5 break-all text-foreground">{email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Domicilio</dt>
            <dd className="mt-0.5 text-foreground">{domicilio || "—"}</dd>
          </div>
          {categorias.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Rubros</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {categorias.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    {c.nombre}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* CV */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">Currículum vitae</h2>
        <div className="mt-3">
          {cvUrl ? (
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primario h-9"
            >
              Ver CV
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              El candidato retiró o eliminó su CV.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
