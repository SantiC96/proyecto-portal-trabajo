import { requerirUsuarioPagina } from "@/lib/auth";
import { PublicFooter } from "@/components/public/public-footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requerirUsuarioPagina();

  return (
    <>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </>
  );
}
