"use client";

import { useRouter } from "next/navigation";

export function ReintentarCarga() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="btn-neutro inline-flex min-h-11 items-center justify-center px-4 text-sm"
    >
      Intentar de nuevo
    </button>
  );
}
