"use client";

import { useEffect, useState } from "react";

import {
  checkSupabaseHealth,
  SUPABASE_HEALTH_QUERY,
  type SupabaseHealthResult
} from "@/src/lib/supabase/client";

type HealthState =
  | { status: "loading" }
  | { status: "ready"; result: SupabaseHealthResult }
  | { status: "error"; message: string };

export default function SupabaseHealthPage() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    checkSupabaseHealth()
      .then((result) => {
        if (isMounted) {
          setHealth({ status: "ready", result });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setHealth({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens Supabase healthcheck."
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const reachable =
    health.status === "loading"
      ? "Wordt getest"
      : health.status === "ready" && health.result.ok
        ? "Ja"
        : "Nee";

  const errorMessage =
    health.status === "ready"
      ? health.result.error?.message
      : health.status === "error"
        ? health.message
        : null;

  return (
    <section className="placeholder">
      <h1>Supabase healthcheck</h1>
      <p>Tijdelijke ontwikkelpagina voor de frontend Supabase verbinding.</p>

      <dl className="healthcheck-list">
        <div>
          <dt>Supabase bereikbaar</dt>
          <dd>{reachable}</dd>
        </div>
        <div>
          <dt>Query</dt>
          <dd>{SUPABASE_HEALTH_QUERY}</dd>
        </div>
        <div>
          <dt>Foutmelding</dt>
          <dd>{errorMessage ?? "Geen foutmelding"}</dd>
        </div>
      </dl>
    </section>
  );
}
