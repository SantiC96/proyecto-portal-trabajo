import { Esqueleto, EsqueletoTexto } from "@/components/ui/esqueleto";

export default function Loading() {
  return (
    <section className="w-full">
      <div className="flex items-center gap-4 mb-8">
        <Esqueleto className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Esqueleto className="h-6 w-40" />
          <Esqueleto className="h-4 w-48" />
        </div>
      </div>
      <div className="space-y-4">
        <EsqueletoTexto />
        <EsqueletoTexto className="w-3/4" />
        <EsqueletoTexto className="w-5/6" />
        <EsqueletoTexto />
        <EsqueletoTexto className="w-2/3" />
      </div>
    </section>
  );
}
