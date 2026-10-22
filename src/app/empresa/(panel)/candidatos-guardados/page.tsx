import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookmarkCheck, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import type { FilaCandidatoParaEmpresa } from "@/types/db";
import { logError } from "@/lib/logger";
import { formatFecha } from "@/lib/fechas";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { NotaGuardadoEditor } from "./_components/nota-editor";
import { QuitarGuardadoBtn } from "./_components/quitar-guardado-btn";
import { BotonVolver } from "@/components/ui/boton-volver";

export const metadata: Metadata = {
  title: "Candidatos guardados | Portal de Empleo Funes",
};

const RUTA = "/empresa/candidatos-guardados";

export default async function CandidatosGuardadosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const sp = await searchParams;
  const pagina = leerPagina(sp.pagina);
  const empresa = await requerirEmpresaPagina("/empresa");

  return (
    <section>
      <BotonVolver href="/empresa">Volver al panel</BotonVolver>
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

      <Suspense
        key={pagina}
        fallback={<EsqueletoLista filas={3} className="mt-6" />}
      >
        <ListadoGuardados empresaId={empresa.id} pagina={pagina} searchParams={sp} />
      </Suspense>
    </section>
  );
}

async function ListadoGuardados({
  empresaId,
  pagina,
  searchParams,
}: {
  empresaId: string;
  pagina: number;
  searchParams: ParamsUrl;
}) {
  const supabase = await createSupabaseServerClient();

  const resultado = await consultarPagina(pagina, (desde, hasta) =>
    supabase
      .from("candidatos_guardados")
      .select(
        "id, postulante_id, nota, created_at, oferta_origen_id, ofertas!oferta_origen_id(titulo)",
        { count: "exact" }
      )
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(desde, hasta)
  );

  if (!resultado.ok) {
    const ref = logError("empresa_candidatos_guardados", resultado.error);
    return <ErrorListado className="mt-6" refError={ref} />;
  }

  const guardados = resultado.filas;

  if (guardados.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
        className="mt-6"
        icono={BookmarkCheck}
        titulo="Todavía no guardaste ningún candidato"
        descripcion="Desde la ficha de un candidato derivado podés guardarlo para futuras búsquedas."
        accion={
          <Link
            href="/empresa/ofertas"
            className="btn-primario inline-flex h-11 items-center gap-2 px-4 text-sm"
          >
            Ver mis ofertas
          </Link>
        }
      />
    );
  }

  // Get candidato data for each saved candidate
  const candidatoMap: Record<string, FilaCandidatoParaEmpresa> = {};
  if (guardados.length > 0) {
    const uniqueIds = [...new Set(guardados.map((g) => g.postulante_id))];
    const results = await Promise.all(
      uniqueIds.map((pid) =>
        supabase.rpc("candidato_para_empresa", { p_postulante_id: pid })
      )
    );
    uniqueIds.forEach((pid, i) => {
      const row = results[i].data?.[0];
      if (row) candidatoMap[pid] = row;
    });
  }

  return (
    <>
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
      <Paginacion
        className="mt-6"
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </>
  );
}
