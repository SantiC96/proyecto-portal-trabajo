import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { obtenerEmpresaActual, requerirRolPagina } from "@/lib/auth";
import { Briefcase, Building2, Calendar, Clock, History, Info, PencilLine, UserCheck } from "lucide-react";
import { EncabezadoPagina } from "@/components/ui/encabezado-pagina";
import { Franja } from "@/components/ui/franja";
import { LineaDeTiempo } from "@/components/ui/linea-de-tiempo";
import { ContactoOficina } from "@/components/public/contacto-oficina";
import { IconoCuadro } from "@/components/ui/icono-cuadro";
import { TituloBloque } from "@/components/ui/titulo-bloque";
import { formatFecha } from "@/lib/fechas";
import { BotonVolver } from "@/components/ui/boton-volver";

const TARJETA = "tarjeta tarjeta-panel min-w-0";
const TARJETA_RECHAZADA = "tarjeta px-4 py-5 sm:p-6";
const TITULO_TARJETA = "text-lg leading-snug font-extrabold text-heading";

// Lo que la empresa hace en el portal una vez aprobada.
const AL_APROBARSE = [
  {
    Icono: Briefcase,
    clase: "bg-primary",
    titulo: "Publicar ofertas laborales",
    texto: "Cargás tus ofertas y la Oficina las revisa antes de publicarlas en el portal.",
  },
  {
    Icono: UserCheck,
    clase: "bg-teal",
    titulo: "Recibir candidatos preseleccionados",
    texto: "La Oficina te deriva los postulantes que se ajustan a cada oferta.",
  },
  {
    Icono: Calendar,
    clase: "bg-info",
    titulo: "Coordinar entrevistas",
    texto: "Acordás las entrevistas con los candidatos y avisás a quién seleccionaste.",
  },
];

export default async function EmpresaPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requerirRolPagina("empresa");
  const empresa = await obtenerEmpresaActual();
  if (!empresa) redirect("/");

  const encabezado = (
    <EncabezadoPagina banda botonesBlancos titulo={`Hola, ${empresa.razon_social}`} />
  );

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
      <main className="flex flex-1 flex-col gap-6">
        <BotonVolver href="/" destacado />
        <EncabezadoPagina
          banda
          className="-mt-2"
          botonesBlancos
          titulo={`Hola, ${empresa.razon_social}`}
          bajada="Tu cuenta está en revisión. Te avisamos por email cuando la Oficina la apruebe."
        />

        <section aria-labelledby="revision-titulo" className="aviso-respuesta text-accent-foreground">
          <div className="flex items-start gap-3.5">
            <IconoCuadro icono={Clock} tamano={44} className="bg-accent text-accent-foreground" />
            <div className="min-w-0">
              <h2 id="revision-titulo" className="text-lg leading-snug font-extrabold text-accent-foreground">
                Tu cuenta está en revisión
              </h2>
              <p className="mt-0.5 text-[15px] leading-[1.45] text-invitacion-detalle">
                {reenviada
                  ? "Recibimos tu solicitud corregida. La Oficina de Empleo la va a revisar de nuevo."
                  : "Recibimos tu solicitud. La Oficina de Empleo de la Municipalidad de Funes está revisando los datos de tu empresa."}
              </p>
            </div>
          </div>
        </section>

        {/* Las dos tarjetas miden lo mismo lado a lado; en angosto, apiladas. */}
        <div className="@container">
          <div className="grid grid-cols-1 items-stretch gap-6 @3xl:grid-cols-2">
            <section aria-labelledby="estado-solicitud" className={TARJETA}>
              <TituloBloque id="estado-solicitud" titulo="Estado de tu solicitud" icono={History} />
              <LineaDeTiempo
                variante="pasos"
                className="mt-6"
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
                    titulo: "Cuenta aprobada",
                    estado: "pendiente",
                    icono: Building2,
                  },
                ]}
              />
            </section>

            <section aria-labelledby="mientras-tanto" className={TARJETA}>
              <TituloBloque id="mientras-tanto" titulo="¿Qué pasa mientras tanto?" icono={Info} />
              <p className="mt-4 text-[15px] text-muted-foreground-strong">
                Una vez aprobada tu cuenta, vas a poder publicar ofertas laborales y recibir
                preselecciones de candidatos. El proceso tarda entre 1 y 3 días hábiles.
              </p>
              <ul className="mt-5 flex flex-col gap-4" aria-label="Cuando se apruebe tu cuenta">
                {AL_APROBARSE.map(({ Icono, clase, titulo, texto }) => (
                  <li key={titulo} className="flex items-start gap-3">
                    <IconoCuadro icono={Icono} className={clase} />
                    <div className="min-w-0">
                      <p className="text-[15px] leading-snug font-extrabold text-heading">{titulo}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground-strong">{texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <ContactoOficina recuadros bajada="¿Dudas sobre tu solicitud? Escribinos o acercate." />
      </main>
    );
  }

  // ── Rechazada ─────────────────────────────────────────────────────────────
  if (empresa.estado_aprobacion === "rechazada") {
    return (
      <main className="flex-1">
        <BotonVolver href="/" destacado />
        <div className="mt-4">{encabezado}</div>

        <Franja tono="error" titulo="Tu solicitud fue rechazada" className="mt-6">
          La Oficina de Empleo revisó tu solicitud y no pudo aprobarla en este momento.
          {empresa.motivo_rechazo && (
            <span className="mt-1.5 block">
              <strong className="font-bold">Motivo:</strong> {empresa.motivo_rechazo}
            </span>
          )}
        </Franja>

        <section aria-labelledby="que-podes-hacer" className={`${TARJETA_RECHAZADA} mt-6`}>
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
