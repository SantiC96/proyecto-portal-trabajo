export function TituloBloque({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>
    </div>
  );
}
