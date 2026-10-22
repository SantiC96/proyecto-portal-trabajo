import { requerirUsuarioPagina } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requerirUsuarioPagina();

  return (
    <>
      <main className="flex-1">{children}</main>
    </>
  );
}
