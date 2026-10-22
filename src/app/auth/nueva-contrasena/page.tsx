import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RECOVERY_COOKIE } from "@/lib/session-config";
import { NuevaContrasenaForm } from "./form";

export default async function NuevaContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;
  const cookieStore = await cookies();
  const hasRecoveryCookie = !!cookieStore.get(RECOVERY_COOKIE);

  if (!token_hash && !hasRecoveryCookie) {
    redirect("/auth/recuperar-contrasena?error=link-vencido");
  }

  return (
    <AuthShell>
      <NuevaContrasenaForm
        tokenHash={type === "recovery" ? (token_hash ?? "") : ""}
      />
    </AuthShell>
  );
}
