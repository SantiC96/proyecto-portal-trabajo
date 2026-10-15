import "server-only";

type Extra = Record<string, string | number | boolean | null | undefined>;
type KnownError = { code?: string; message?: string };

function genRef(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function logError(contexto: string, err: unknown, extra?: Extra): string {
  const ref = genRef();

  if (process.env.NODE_ENV === "production") {
    const e = err as KnownError | null;
    const entry: Record<string, unknown> = {
      ref,
      contexto,
      ...(e?.code ? { pgCode: e.code } : {}),
      ...extra,
    };
    console.error(JSON.stringify(entry));
  } else {
    console.error(`[${contexto}] ref=${ref}`, err, extra ?? "");
  }

  return ref;
}
