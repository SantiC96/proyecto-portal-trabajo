import { requerirRolPagina } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requerirRolPagina("municipalidad");

  return (
    <>
      <main className="flex-1">{children}</main>
    </>
  );
}
