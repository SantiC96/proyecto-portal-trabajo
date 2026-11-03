import { FondoVideoAuth } from "@/components/auth/fondo-video-auth";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <FondoVideoAuth />
      {children}
    </>
  );
}
