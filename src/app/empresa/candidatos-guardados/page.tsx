import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookmarkCheck, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatFecha } from "@/lib/fechas";
import { NotaGuardadoEditor } from "./_components/nota-editor";
import { QuitarGuardadoBtn } from "./_components/quitar-guardado-btn";

export const metadata: Metadata = {
  title: "Candidatos guardados | Portal de Empleo Funes",
};

type GuardadoRow = {
  id: string;
  postulante_id: string;
  nota: string | null;
  created_at: string;
  oferta_origen_id: string | null;
  ofertas: { titulo: string } | null;
};

type CandidatoData = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  cv_ruta: string | null;
};

export default async function CandidatosGuardadosPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!empresa) redirect("/empresa");

  const { data: rows } = await supabase
    .from("candidatos_guardados")
    .select("id, postulante_id, nota, created_at, oferta_origen_id, ofertas!oferta_origen_id(titulo)")
    .order("created_at", { ascending: false });

  const guardados = (rows ?? []) as unknown as GuardadoRow[];

  // Get candidato data for each saved candidate
  const candidatoMap: Record<string, CandidatoData> = {};
  if (guardados.length > 0) {
    const uniqueIds = [...new Set(guardados.map((g) => g.postulante_id))];
    const results = await Promise.all(
      uniqueIds.map((pid) =>
        supabase.rpc("candidato_para_empresa", { p_postulante_id: pid })
      )
    );
    uniqueIds.forEach((pid, i) => {
      const row = (results[i].data as CandidatoData[] | null)?.[0];
      if (row) candidatoMap[pid] = row;
    });
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3">
        <BookmarkCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Candidatos guardados
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Perfiles que guardaste para futuras búsquedas.
          </p>
        </div>
      </div>

      {guardados.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <BookmarkCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Todavía no guardaste ningún candidato
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Desde la ficha de un candidato derivado podés guardarlo para
              futuras búsquedas.
            </p>
          </div>
          <Link
            href="/empresa/ofertas"
            className="btn-primario inline-flex h-10 items-center gap-2 px-4 text-sm"
          >
            Ver mis ofertas
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {guardados.map((g) => {
            const candidato = candidatoMap[g.postulante_id];
            const nombre = candidato
              ? `${candidato.nombre} ${candidato.apellido}`
              : "Candidato";

            return (
              <li
                key={g.id}
                className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-xs sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-foreground">{nombre}</p>
                    {candidato && (
                      <p className="text-sm text-muted-foreground">
                        {candidato.email}
                        {candidato.telefono ? ` · ${candidato.telefono}` : ""}
                      </p>
                    )}
                    {g.ofertas && (
                      <p className="text-xs text-muted-foreground">
                        Conocido por: {g.ofertas.titulo}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Guardado el {formatFecha(g.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/empresa/candidatos/${g.postulante_id}`}
                      className="btn-secundario inline-flex h-8 items-center gap-1.5 px-3 text-xs font-medium"
                    >
                      <User className="h-3.5 w-3.5" />
                      Ver perfil
                    </Link>
                    <QuitarGuardadoBtn guardadoId={g.id} nombre={nombre} />
                  </div>
                </div>

                {/* Nota editable */}
                <div className="mt-4 border-t border-border pt-4">
                  <NotaGuardadoEditor guardadoId={g.id} notaInicial={g.nota} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
