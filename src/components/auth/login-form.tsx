
"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  User,
} from "lucide-react";
import { login } from "@/app/auth/actions";
import type { ErrorAccion } from "@/lib/resultado";
import { toErrorAccion } from "@/lib/resultado";
import {
  CLASE_CONTROL_INVALIDO,
  ErrorCampo,
  Obligatorio,
  ariaErrorCampo,
} from "@/components/ui/obligatorio";
import { useErroresCampo } from "@/lib/use-errores-campo";
import { useAccion } from "@/lib/use-accion";
import { Spinner } from "@/components/ui/spinner";
import { Aviso } from "@/components/ui/aviso";
import { AuthLink } from "@/components/auth/auth-link";
import { MENSAJE_CUENTA_DESACTIVADA } from "@/lib/auth-errors";

export function LoginForm({
  confirmacionError,
  inactividad,
  sesionAnterior,
  contrasenaActualizada,
  cuentaDesactivada,
  redirect,
}: {
  confirmacionError?: boolean;
  inactividad?: boolean;
  sesionAnterior?: boolean;
  contrasenaActualizada?: boolean;
  cuentaDesactivada?: boolean;
  redirect?: string;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pendiente: isLoading, ejecutar } = useAccion();
  const [error, setError] = useState<ErrorAccion | null>(null);
  const campos = useErroresCampo<"email" | "password">();
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const botonRegistroRef = useRef<HTMLButtonElement>(null);
  const idOpcionesRegistro = useId();
  // Belt-and-suspenders: force the root layout to re-render after a proxy signOut
  // (inactivity, previous-browser session or deactivated account) so the navigation
  // reflects the cleared session without needing a manual F5.
  useEffect(() => {
    if (inactividad || sesionAnterior || cuentaDesactivada) router.refresh();
  }, [inactividad, sesionAnterior, cuentaDesactivada, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!campos.validar({ email, password }, e.currentTarget)) return;
    // En el éxito la acción redirige.
    ejecutar(async () => {
      const result = await login({ email, password, redirectTo: redirect });
      if (result && !result.ok) setError(toErrorAccion(result));
    });
  };

  return (
    <div className="auth-tarjeta login-tarjeta login-entrada login-entrada--demorada">
      <Image
        src="/images/logo-funes-verde.png"
        alt="Municipalidad de Funes"
        width={120}
        height={34}
        className="h-auto w-[120px]"
        loading="eager"
      />

      <div>
        <p className="login-volanta">Tu espacio para avanzar</p>
        <h1 className="login-titulo">Tu próximo trabajo está más cerca</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Ingresá para continuar en el Portal de Empleo.
        </p>
      </div>

      {confirmacionError && (
        <Aviso tono="danger">
          No pudimos confirmar tu cuenta. El enlace puede haber vencido; intentá iniciar
          sesión o registrate de nuevo.
        </Aviso>
      )}

      {inactividad && (
        <Aviso tono="info">Tu sesión se cerró por inactividad. Iniciá sesión de nuevo.</Aviso>
      )}

      {sesionAnterior && <Aviso tono="info">Por seguridad, volvé a iniciar sesión.</Aviso>}

      {/* Deactivated office account (the open session was closed) */}
      {cuentaDesactivada && !error && <Aviso tono="danger">{MENSAJE_CUENTA_DESACTIVADA}</Aviso>}

      {contrasenaActualizada && (
        <Aviso tono="success">Tu contraseña se actualizó. Iniciá sesión con la nueva.</Aviso>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="login-email" className="etiqueta-campo">
            Correo electrónico <Obligatorio />
          </label>
          <div className="login-campo">
            <Mail aria-hidden="true" className="login-campo-icono" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                campos.limpiar("email");
              }}
              placeholder="tucorreo@ejemplo.com"
              {...ariaErrorCampo("login-email", campos.errores.email)}
              className={`campo login-input ${CLASE_CONTROL_INVALIDO}`}
            />
          </div>
          <ErrorCampo idCampo="login-email" mensaje={campos.errores.email} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <label htmlFor="login-password" className="etiqueta-campo">
              Contraseña <Obligatorio />
            </label>
            <Link href="/auth/recuperar-contrasena" className="login-link">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="login-campo">
            <Lock aria-hidden="true" className="login-campo-icono" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                campos.limpiar("password");
              }}
              placeholder="••••••••"
              {...ariaErrorCampo("login-password", campos.errores.password)}
              className={`campo login-input login-input--con-boton ${CLASE_CONTROL_INVALIDO}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="login-ver-contrasena"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Eye aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </div>
          <ErrorCampo idCampo="login-password" mensaje={campos.errores.password} />
        </div>

        {error && (
          <Aviso tono="danger" aria-live="polite">
            {error.mensaje}
            {error.ref && (
              <p className="mt-1 text-sm">
                Si el problema sigue, comunicate con la Oficina de Empleo e indicá este código:{" "}
                {error.ref}
              </p>
            )}
          </Aviso>
        )}

        <button
          type="submit"
          id="login-submit-btn"
          disabled={isLoading}
          aria-busy={isLoading}
          className="btn-primario login-enviar"
        >
          {isLoading ? <Spinner /> : <LogIn aria-hidden="true" />}
          {isLoading ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>

      <div className="text-center text-[15px] text-muted-foreground">
        <p>
          ¿Nuevo en el portal?{" "}
          <button
            ref={botonRegistroRef}
            type="button"
            onClick={() => setRegistroAbierto((abierto) => !abierto)}
            aria-expanded={registroAbierto}
            aria-controls={idOpcionesRegistro}
            className="login-link login-link--boton"
          >
            Registrate
          </button>
        </p>

        <div id={idOpcionesRegistro} hidden={!registroAbierto}>
          {registroAbierto && (
            <div className="login-registro">
              <div className="flex items-center justify-between gap-3">
                <p className="text-left text-sm font-bold text-heading">
                  ¿Cómo querés registrarte?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRegistroAbierto(false);
                    botonRegistroRef.current?.focus();
                  }}
                  className="login-link login-link--boton min-h-11 px-2"
                >
                  Cancelar
                </button>
              </div>
              <AuthLink href="/auth/registro" className="login-opcion">
                <span className="login-opcion-icono" aria-hidden="true">
                  <User />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-bold text-heading">Soy postulante</span>
                  <span className="block text-sm text-muted-foreground">
                    Busco trabajo y quiero postularme
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-icon" />
              </AuthLink>
              <AuthLink href="/auth/registro?tipo=empresa" className="login-opcion">
                <span className="login-opcion-icono" aria-hidden="true">
                  <Building2 />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-bold text-heading">Soy empresa</span>
                  <span className="block text-sm text-muted-foreground">
                    Quiero publicar ofertas de trabajo
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-icon" />
              </AuthLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
