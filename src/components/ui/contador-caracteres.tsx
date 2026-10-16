import { cn } from "@/lib/utils";

type Props = {
  actual: number;
  maximo: number;
  id?: string;
  className?: string;
};

export function ContadorCaracteres({ actual, maximo, id, className }: Props) {
  return (
    <p id={id} className={cn("text-xs text-muted-foreground", className)}>
      {actual}/{maximo}
    </p>
  );
}
