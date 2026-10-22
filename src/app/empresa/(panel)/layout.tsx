import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerEmpresaActual, requerirRolPagina } from "@/lib/auth";
import { Clock, XCircle } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";

export default async function EmpresaPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requerirRolPagina("empresa");
  const empresa = await obtenerEmpresaActual();
  if (!empresa) redirect("/");

  // ── Pendiente ─────────────────────────────────────────────────────────────
  if (empresa.estado_aprobacion === "pendiente") {
    const supabase = await createSupabaseServerClient();
    const { data: hist } = await supabase
      .from("historial_aprobacion_empresa")
      .select("evento")
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const reenviada = hist?.[0]?.evento === "reenviada";

    return (
      <>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Tu cuenta está en revisión
            </h1>
            {reenviada ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Recibimos tu solicitud corregida. La Oficina de Empleo la va a
                revisar de nuevo.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Recibimos tu solicitud. La Oficina de Empleo de la
                Municipalidad de Funes está revisando los datos de tu empresa.
              </p>
            )}
            <div className="mt-4 rounded-lg border border-border bg-surface-tinted px-4 py-3 text-left text-sm">
              <p className="font-semibold text-foreground">
                ¿Qué pasa mientras tanto?
              </p>
              <p className="mt-1 text-muted-foreground">
                Una vez aprobada tu cuenta, vas a poder publicar ofertas
                laborales y recibir preselecciones de candidatos. El proceso
                tarda entre 1 y 3 días hábiles.
              </p>
            </div>
            <p className="mt-6 text-xs text-muted-icon">
              ¿Tenés alguna consulta? Comunicate con la Oficina de Empleo.
            </p>
          </div>
        </main>
      </>
    );
  }

  // ── Rechazada ─────────────────────────────────────────────────────────────
  if (empresa.estado_aprobacion === "rechazada") {
    return (
      <>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger text-white">
              <XCircle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Tu solicitud fue rechazada
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              La Oficina de Empleo revisó tu solicitud y no pudo aprobarla en
              este momento.
            </p>
            {empresa.motivo_rechazo && (
              <Aviso tono="danger" titulo="Motivo:" role="none" className="mt-4 text-left">
                {empresa.motivo_rechazo}
              </Aviso>
            )}
            <Link
              href="/empresa/solicitud"
              className="btn-primario mt-6"
            >
              Corregir y reenviar solicitud
            </Link>
            <p className="mt-4 text-xs text-muted-icon">
              ¿Tenés dudas? Comunicate con la Oficina de Empleo de la
              Municipalidad de Funes.
            </p>
          </div>
        </main>
      </>
    );
  }

  // ── Aprobada: renderizar panel ────────────────────────────────────────────
  return (
    <>
      <main className="flex-1">{children}</main>
    </>
  );
}
