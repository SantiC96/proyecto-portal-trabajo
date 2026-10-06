"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  marcarEnRevision,
  descartarPostulacion,
  derivarPostulacion,
} from "../actions";

type EstadoPostulacion =
  | "recibida"
  | "en_revision"
  | "derivada"
  | "rechazada_municipalidad";

type Props = {
  postulacionId: string;
  estado: EstadoPostulacion;
  derivacion?: {
    nota_municipalidad: string | null;
    created_at: string;
  } | null;
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FichaAcciones({ postulacionId, estado, derivacion }: Props) {
  const [abrirDescartar, setAbrirDescartar] = useState(false);
  const [abrirDerivar, setAbrirDerivar] = useState(false);
  const [abrirReconsiderar, setAbrirReconsiderar] = useState(false);
  const [notaDescartar, setNotaDescartar] = useState("");
  const [notaDerivar, setNotaDerivar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cerrarTodo() {
    setAbrirDescartar(false);
    setAbrirDerivar(false);
    setAbrirReconsiderar(false);
    setError(null);
    setNotaDescartar("");
    setNotaDerivar("");
  }

  function handleDescartar() {
    setError(null);
    startTransition(async () => {
      const res = await descartarPostulacion(postulacionId, notaDescartar);
      if (res.error) {
        setError(res.error);
      } else {
        cerrarTodo();
      }
    });
  }

  function handleDerivar() {
    setError(null);
    startTransition(async () => {
      const res = await derivarPostulacion(postulacionId, notaDerivar);
      if (res.error) {
        setError(res.error);
      } else {
        cerrarTodo();
      }
    });
  }

  function handleReconsiderar() {
    setError(null);
    startTransition(async () => {
      const res = await marcarEnRevision(postulacionId);
      if (res.error) {
        setError(res.error);
      } else {
        setAbrirReconsiderar(false);
      }
    });
  }

  // Estado derivada: solo lectura
  if (estado === "derivada") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface-tinted p-4">
        <p className="text-sm font-medium text-primary">Derivada a la empresa</p>
        {derivacion?.created_at && (
          <p className="mt-1 text-sm text-muted-foreground">
            Derivada el {formatearFecha(derivacion.created_at)}
          </p>
        )}
        {derivacion?.nota_municipalidad && (
          <p className="mt-2 text-sm text-foreground">
            <span className="font-medium">Nota de derivación: </span>
            {derivacion.nota_municipalidad}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {(estado === "recibida" || estado === "en_revision") && (
          <>
            <Button
              onClick={() => { setError(null); setAbrirDerivar(true); }}
              disabled={isPending}
              className="min-h-11"
            >
              Derivar a la empresa
            </Button>
            <button
              type="button"
              onClick={() => { setError(null); setAbrirDescartar(true); }}
              disabled={isPending}
              className="btn-secundario min-h-11 px-4 text-sm font-medium"
            >
              No seleccionar
            </button>
          </>
        )}

        {estado === "rechazada_municipalidad" && (
          <button
            type="button"
            onClick={() => { setError(null); setAbrirReconsiderar(true); }}
            disabled={isPending}
            className="btn-secundario min-h-11 px-4 text-sm font-medium"
          >
            Reconsiderar
          </button>
        )}
      </div>

      {/* Dialog: No seleccionar */}
      <Dialog
        open={abrirDescartar}
        onOpenChange={(open) => {
          setAbrirDescartar(open);
          if (!open) { setNotaDescartar(""); setError(null); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No seleccionar candidato</DialogTitle>
            <DialogDescription>
              El postulante va a ver su postulación como{" "}
              <span className="font-semibold text-foreground">
                «No seleccionada»
              </span>
              . Podés dejar una nota interna (no la ve el postulante).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="nota-descartar"
              className="text-sm font-medium text-foreground"
            >
              Nota interna{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </label>
            <Textarea
              id="nota-descartar"
              value={notaDescartar}
              onChange={(e) => setNotaDescartar(e.target.value)}
              placeholder="¿Por qué no se selecciona a este candidato?"
              className="min-h-24"
              disabled={isPending}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => { setAbrirDescartar(false); setNotaDescartar(""); setError(null); }}
              disabled={isPending}
              className="btn-secundario h-9 px-4 text-sm font-medium"
            >
              Cancelar
            </button>
            <Button onClick={handleDescartar} disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Derivar a la empresa */}
      <Dialog
        open={abrirDerivar}
        onOpenChange={(open) => {
          setAbrirDerivar(open);
          if (!open) { setNotaDerivar(""); setError(null); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Derivar a la empresa</DialogTitle>
            <DialogDescription>
              La empresa recibirá los datos del candidato. Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="nota-derivar"
              className="text-sm font-medium text-foreground"
            >
              ¿Por qué recomendás a este candidato?{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </label>
            <Textarea
              id="nota-derivar"
              value={notaDerivar}
              onChange={(e) => setNotaDerivar(e.target.value)}
              placeholder="Contá brevemente por qué este perfil encaja con la búsqueda…"
              className="min-h-24"
              disabled={isPending}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => { setAbrirDerivar(false); setNotaDerivar(""); setError(null); }}
              disabled={isPending}
              className="btn-secundario h-9 px-4 text-sm font-medium"
            >
              Cancelar
            </button>
            <Button onClick={handleDerivar} disabled={isPending}>
              {isPending ? "Derivando..." : "Derivar candidato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reconsiderar */}
      <Dialog
        open={abrirReconsiderar}
        onOpenChange={(open) => {
          setAbrirReconsiderar(open);
          if (!open) setError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconsiderar candidato</DialogTitle>
            <DialogDescription>
              La postulación volverá a{" "}
              <span className="font-semibold text-foreground">En revisión</span>
              .
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => { setAbrirReconsiderar(false); setError(null); }}
              disabled={isPending}
              className="btn-secundario h-9 px-4 text-sm font-medium"
            >
              Cancelar
            </button>
            <Button onClick={handleReconsiderar} disabled={isPending}>
              {isPending ? "Guardando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
