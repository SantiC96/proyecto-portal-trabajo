import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PublicFooter } from "@/components/public/public-footer";
import { Clock, XCircle } from "lucide-react";

export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // ── Gate 1: rol ───────────────────────────────────────────────────────────
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "empresa") redirect("/");

  // ── Gate 2: estado de aprobación ──────────────────────────────────────────
  const { data: empresa } = await supabase
    .from("empresas")
    .select("estado_aprobacion, motivo_rechazo")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!empresa) redirect("/");

  // ── Pendiente ─────────────────────────────────────────────────────────────
  if (empresa.estado_aprobacion === "pendiente") {
    return (
      <>
        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Tu cuenta está en revisión
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Recibimos tu solicitud. La Oficina de Empleo de la Municipalidad
              de Funes está revisando los datos de tu empresa.
            </p>
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
        <PublicFooter />
      </>
    );
  }

  // ── Rechazada ─────────────────────────────────────────────────────────────
  if (empresa.estado_aprobacion === "rechazada") {
    return (
      <>
        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
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
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                <p className="font-semibold">Motivo:</p>
                <p className="mt-1">{empresa.motivo_rechazo}</p>
              </div>
            )}
            <p className="mt-6 text-xs text-muted-icon">
              Si creés que hubo un error, comunicate con la Oficina de Empleo
              de la Municipalidad de Funes.
            </p>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  // ── Aprobada: renderizar children ─────────────────────────────────────────
  return (
    <>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </>
  );
}
