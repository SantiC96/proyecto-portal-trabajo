import { requerirRolPagina } from "@/lib/auth";
import { PublicFooter } from "@/components/public/public-footer";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requerirRolPagina("municipalidad");

  return (
    <>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </>
  );
}
