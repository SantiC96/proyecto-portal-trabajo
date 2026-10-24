import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerEmpresaActual, requerirRolPagina } from "@/lib/auth";
import { Briefcase, CalendarCheck, Clock, PencilLine, UserCheck } from "lucide-react";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { Franja } from "@/components/ui/franja";
import { LineaDeTiempo } from "@/components/ui/linea-de-tiempo";
import { ContactoOficina } from "@/components/public/contacto-oficina";
import { formatFecha } from "@/lib/fechas";

const TARJETA = "tarjeta px-4 py-5 sm:p-6";
const TITULO_TARJETA = "text-lg leading-snug font-extrabold text-heading";

// Lo que la empresa hace en el portal una vez aprobada.
const AL_APROBARSE = [
  { Icono: Briefcase, texto: "Publicar ofertas laborales" },
  { Icono: UserCheck, texto: "Recibir candidatos preseleccionados por la Oficina" },
  { Icono: CalendarCheck, texto: "Coordinar entrevistas" },
];

export default async function EmpresaPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requerirRolPagina("empresa");
  const empresa = await obtenerEmpresaActual();
  if (!empresa) redirect("/");

  const encabezado = <EncabezadoPagina titulo={`Hola, ${empresa.razon_social}`} />;

  // ── Pendiente ─────────────────────────────────────────────────────────────
  if (empresa.estado_aprobacion === "pendiente") {
    const supabase = await createSupabaseServerClient();
    const { data: hist } = await supabase
      .from("historial_aprobacion_empresa")
      .select("evento, created_at")
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const reenviada = hist?.[0]?.evento === "reenviada";
    // La solicitud original no tiene evento en el historial: su fecha es la
    // del alta de la empresa.
    const fechaSolicitud = reenviada ? hist?.[0]?.created_at : empresa.created_at;

    return (
      <main className="flex-1">
        {encabezado}

        <Franja tono="aviso" icono={Clock} titulo="Tu cuenta está en revisión" className="mt-6">
          {reenviada
            ? "Recibimos tu solicitud corregida. La Oficina de Empleo la va a revisar de nuevo."
            : "Recibimos tu solicitud. La Oficina de Empleo de la Municipalidad de Funes está revisando los datos de tu empresa."}
        </Franja>

        <div className="@container mt-6">
          <div className="grid grid-cols-1 items-stretch gap-6 @3xl:grid-cols-2">
            <section aria-labelledby="estado-solicitud" className={TARJETA}>
              <h2 id="estado-solicitud" className={TITULO_TARJETA}>
                Estado de tu solicitud
              </h2>
              <LineaDeTiempo
                className="mt-5"
                eventos={[
                  {
                    clave: "enviada",
                    titulo: reenviada ? "Solicitud reenviada" : "Solicitud enviada",
                    detalle: fechaSolicitud ? formatFecha(fechaSolicitud) : undefined,
                    estado: "hecho",
                  },
                  {
                    clave: "revision",
                    titulo: "En revisión por la Oficina de Empleo",
                    estado: "actual",
                  },
                  {
                    clave: "aprobada",
                    titulo: "Cuenta aprobada: vas a poder publicar ofertas",
                    estado: "pendiente",
                  },
                ]}
              />
            </section>

            <section aria-labelledby="mientras-tanto" className={TARJETA}>
              <h2 id="mientras-tanto" className={TITULO_TARJETA}>
                ¿Qué pasa mientras tanto?
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground-strong">
                Una vez aprobada tu cuenta, vas a poder publicar ofertas laborales y recibir
                preselecciones de candidatos. El proceso tarda entre 1 y 3 días hábiles.
              </p>
              <ul className="mt-5 flex flex-col gap-3" aria-label="Cuando se apruebe tu cuenta">
                {AL_APROBARSE.map(({ Icono, texto }) => (
                  <li key={texto} className="flex items-center gap-3 text-[15px] text-foreground">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-secondary text-primary"
                    >
                      <Icono className="size-[18px]" />
                    </span>
                    {texto}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="mt-6">
          <ContactoOficina enTarjeta />
        </div>
      </main>
    );
  }

  // ── Rechazada ─────────────────────────────────────────────────────────────
  if (empresa.estado_aprobacion === "rechazada") {
    return (
      <main className="flex-1">
        {encabezado}

        <Franja tono="error" titulo="Tu solicitud fue rechazada" className="mt-6">
          La Oficina de Empleo revisó tu solicitud y no pudo aprobarla en este momento.
          {empresa.motivo_rechazo && (
            <span className="mt-1.5 block">
              <strong className="font-bold">Motivo:</strong> {empresa.motivo_rechazo}
            </span>
          )}
        </Franja>

        <section aria-labelledby="que-podes-hacer" className={`${TARJETA} mt-6`}>
          <h2 id="que-podes-hacer" className={TITULO_TARJETA}>
            Qué podés hacer
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground-strong">
            Corregí los datos de tu empresa y reenviá la solicitud. Al reenviarla, la Oficina de
            Empleo la vuelve a revisar.
          </p>
          <Link href="/empresa/solicitud" className="btn-primario mt-5 w-full sm:w-auto">
            <PencilLine aria-hidden="true" />
            Corregir y reenviar solicitud
          </Link>
        </section>

        <div className="mt-6">
          <ContactoOficina enTarjeta />
        </div>
      </main>
    );
  }

  // ── Aprobada: renderizar panel ────────────────────────────────────────────
  return (
    <>
      <main className="flex-1">{children}</main>
    </>
  );
}
