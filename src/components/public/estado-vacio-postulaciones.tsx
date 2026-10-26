type Props = {
  compacto?: boolean;
  mostrarApoyo?: boolean;
};

function IlustracionCarpetaVacia({ compacto }: { compacto: boolean }) {
  const tamano = compacto ? 64 : 112;

  return (
    <svg
      role="img"
      aria-label="Carpeta vacía con una lupa"
      width={tamano}
      height={tamano}
      viewBox="0 0 112 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <circle cx="56" cy="56" r="52" fill="var(--color-surface)" />
      <path
        d="M15 35.5C15 31.9 17.9 29 21.5 29h24l8 8h37c3.6 0 6.5 2.9 6.5 6.5v35c0 3.6-2.9 6.5-6.5 6.5h-69c-3.6 0-6.5-2.9-6.5-6.5v-43Z"
        fill="var(--color-surface-tinted)"
        stroke="var(--color-border-tab)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 49.5c0-3.6 2.9-6.5 6.5-6.5h68c4.5 0 7.4 4.4 5.8 8.6L84.9 78.3a7 7 0 0 1-6.5 4.4H22a6.5 6.5 0 0 1-6.5-6.5v-26.7Z"
        fill="var(--color-surface-tinted)"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="68" cy="56" r="13" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="4" />
      <path d="m77.5 65.5 10 10" stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" />
      <path d="M35 61h12" stroke="var(--color-border-tab)" strokeWidth="3" strokeLinecap="round" />
      <path d="M31 69h10" stroke="var(--color-border-tab)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EstadoVacioPostulaciones({
  compacto = false,
  mostrarApoyo = true,
}: Props) {
  return (
    <div
      className={`flex flex-1 items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border-tab bg-surface-tinted p-4 ${
        compacto ? "flex-col text-center sm:flex-row sm:text-left" : "flex-col text-center sm:flex-row sm:text-left sm:p-5"
      }`}
    >
      <IlustracionCarpetaVacia compacto={compacto} />
      <div className="max-w-md">
        <p className="font-bold text-foreground">Todavía no te postulaste a ninguna oferta</p>
        {mostrarApoyo && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground-strong">
            Cuando te postules, vas a ver acá el estado de cada proceso.
          </p>
        )}
      </div>
    </div>
  );
}
