import "server-only";

type Extra = Record<string, string | number | boolean | null | undefined>;

function genRef(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function logError(contexto: string, err: unknown, extra?: Extra): string {
  const ref = genRef();

  if (process.env.NODE_ENV === "production") {
    const pgCode =
      typeof err === "object" && err !== null && "code" in err && typeof err.code === "string"
        ? err.code
        : undefined;
    const entry: Record<string, unknown> = {
      ref,
      contexto,
      ...(pgCode ? { pgCode } : {}),
      ...extra,
    };
    console.error(JSON.stringify(entry));
  } else {
    console.error(`[${contexto}] ref=${ref}`, err, extra ?? "");
  }

  return ref;
}
