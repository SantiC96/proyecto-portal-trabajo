import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Briefcase, Mail, Phone, User } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requerirEmpresaPagina } from "@/lib/auth";
import type { FilaCandidatoParaEmpresa } from "@/types/db";
import { logError } from "@/lib/logger";
import { formatFecha } from "@/lib/fechas";
import { fotosDeCandidatosEmpresa } from "@/lib/fotos-perfil";
import { inicialesDePersona } from "@/lib/iniciales";
import { consultarPagina, leerPagina, type ParamsUrl } from "@/lib/paginacion";
import { Paginacion } from "@/components/ui/paginacion";
import { EstadoVacio, ErrorListado } from "@/components/ui/estado-listado";
import { EsqueletoGuardados } from "./esqueleto";
import { NotaGuardadoEditor } from "./_components/nota-editor";
import { QuitarGuardadoBtn } from "./_components/quitar-guardado-btn";
import { BotonVolver } from "@/components/ui/boton-volver";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { AvatarAjustado } from "@/components/ui/avatar-ajustado";

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
    <section className="flex flex-col gap-6">
      <BotonVolver href="/empresa" destacado />
      <EncabezadoPagina
        banda
        className="-mt-2"
        titulo="Candidatos guardados"
        bajada="Perfiles que guardaste para futuras búsquedas."
      />

      <Suspense
        key={pagina}
        fallback={<EsqueletoGuardados />}
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
    return <ErrorListado refError={ref} />;
  }

  const guardados = resultado.filas;

  if (guardados.length === 0) {
    return (
      <EstadoVacio
        tipo="sin-registros"
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

  const postulanteIds = [...new Set(guardados.map((g) => g.postulante_id))];
  const candidatoMap: Record<string, FilaCandidatoParaEmpresa> = {};
  const [results, fotos] = await Promise.all([
    Promise.all(
      postulanteIds.map((pid) =>
        supabase.rpc("candidato_para_empresa", { p_postulante_id: pid })
      )
    ),
    fotosDeCandidatosEmpresa(postulanteIds),
  ]);
  postulanteIds.forEach((pid, i) => {
    const row = results[i].data?.[0];
    if (row) candidatoMap[pid] = row;
  });

  return (
    <>
      <div className="@container">
        <ul className="flex flex-col gap-4">
          {guardados.map((g) => {
            const candidato = candidatoMap[g.postulante_id];
            const nombre = candidato
              ? `${candidato.nombre} ${candidato.apellido}`
              : "Candidato";
            const foto = fotos.get(g.postulante_id);

            return (
              <li
                key={g.id}
                className="tarjeta tarjeta-panel grid grid-cols-[52px_minmax(0,1fr)] gap-x-4 gap-y-4 @2xl:grid-cols-[64px_minmax(0,1.2fr)_minmax(0,1fr)_auto] @2xl:items-start @2xl:gap-x-6"
              >
                <AvatarAjustado
                  src={foto?.url}
                  ajuste={foto?.ajuste}
                  alt=""
                  size="tarjeta"
                  iniciales={
                    candidato ? inicialesDePersona(candidato.nombre, candidato.apellido) : undefined
                  }
                />

                <div className="min-w-0 self-center @2xl:self-start">
                  <h2 className="text-[19px] leading-snug font-extrabold break-words text-heading">
                    {nombre}
                  </h2>
                  {candidato && (
                    <ul className="mt-1.5 flex flex-col gap-1 text-[15px] text-muted-foreground-strong">
                      <li className="flex min-w-0 items-center gap-2">
                        <Mail aria-hidden="true" className="size-4 shrink-0 text-primary" />
                        <span className="sr-only">Email: </span>
                        <span className="min-w-0 break-all">{candidato.email}</span>
                      </li>
                      {candidato.telefono && (
                        <li className="flex min-w-0 items-center gap-2">
                          <Phone aria-hidden="true" className="size-4 shrink-0 text-primary" />
                          <span className="sr-only">Teléfono: </span>
                          <span className="min-w-0 break-words">{candidato.telefono}</span>
                        </li>
                      )}
                    </ul>
                  )}
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {g.ofertas && (
                      <li className={CLASE_CHIP}>
                        <Briefcase aria-hidden="true" className="size-3.5 shrink-0 text-neutral" />
                        <span className="min-w-0 break-words">Conocido por: {g.ofertas.titulo}</span>
                      </li>
                    )}
                    <li className={CLASE_CHIP}>
                      <Bookmark aria-hidden="true" className="size-3.5 shrink-0 text-neutral" />
                      Guardado el {formatFecha(g.created_at)}
                    </li>
                  </ul>
                </div>

                <NotaGuardadoEditor
                  guardadoId={g.id}
                  notaInicial={g.nota}
                  className="col-span-2 @2xl:col-span-1"
                />

                <div className="col-span-2 flex gap-2 *:flex-1 @2xl:col-span-1 @2xl:flex-col @2xl:*:flex-none">
                  <Link
                    href={`/empresa/candidatos/${g.postulante_id}`}
                    className="btn-secundario btn-chico"
                  >
                    <User aria-hidden="true" />
                    Ver perfil
                  </Link>
                  <QuitarGuardadoBtn guardadoId={g.id} nombre={nombre} claseBoton="btn-chico" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <Paginacion
        ruta={RUTA}
        searchParams={searchParams}
        pagina={resultado.pagina}
        total={resultado.total}
      />
    </>
  );
}

/** Chip gris de un candidato guardado ("Conocido por", "Guardado el"). */
const CLASE_CHIP =
  "inline-flex min-w-0 items-center gap-1.5 rounded-[var(--radius-sm)] bg-secondary px-2.5 py-1 text-[13px] font-semibold text-control-foreground";
