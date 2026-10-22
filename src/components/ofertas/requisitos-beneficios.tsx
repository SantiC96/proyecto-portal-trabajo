/**
 * Componentes compartidos para mostrar requisitos y beneficios de una oferta.
 *
 * RequisitosList: siempre visible; si la lista está vacía (ofertas antiguas)
 *   muestra "-" en lugar de la lista.
 * BeneficiosList: solo se renderiza si hay elementos.
 */

interface RequisitoListItem {
  items: string[];
  headingTag?: "h2" | "h3";
}

export function RequisitosList({ items, headingTag: Tag = "h2" }: RequisitoListItem) {
  return (
    <section className="mt-6">
      <Tag className="text-sm font-bold uppercase tracking-wider text-primary">
        Requisitos
      </Tag>
      {items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((req, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground-strong">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {req}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground-strong">-</p>
      )}
    </section>
  );
}

interface BeneficiosListItem {
  items: string[];
  headingTag?: "h2" | "h3";
}

export function BeneficiosList({ items, headingTag: Tag = "h2" }: BeneficiosListItem) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mt-6">
      <Tag className="text-sm font-bold uppercase tracking-wider text-primary">
        Beneficios
      </Tag>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((ben, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground-strong">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {ben}
          </li>
        ))}
      </ul>
    </section>
  );
}
