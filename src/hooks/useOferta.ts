"use client";

import { useEffect, useState } from "react";

interface Oferta {
  id: string;
}

interface UseOfertaResult {
  data: Oferta | null;
  loading: boolean;
  error: string | null;
}

export function useOferta(id: string): UseOfertaResult {
  const [data, setData] = useState<Oferta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    fetch(`/api/ofertas/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d: Oferta) => {
        if (!isCancelled) {
          setData(d);
          setError(null);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!isCancelled) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [id]);

  return { data, loading, error };
}
