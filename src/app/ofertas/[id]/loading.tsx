import { Esqueleto, EsqueletoTexto } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <section className="w-full">
      <Esqueleto className="mb-2 h-8 w-3/4" />
      <Esqueleto className="mb-6 h-4 w-1/2" />
      <div className="flex flex-col gap-3">
        <EsqueletoTexto />
        <EsqueletoTexto className="w-5/6" />
        <EsqueletoTexto className="w-4/6" />
        <EsqueletoTexto />
        <EsqueletoTexto className="w-5/6" />
      </div>
    </section>
  );
}
