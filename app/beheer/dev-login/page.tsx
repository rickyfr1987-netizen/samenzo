"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/dev/auth-context";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

type DevLoginState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      message: string | null;
    }
  | { status: "error"; message: string };

const setupSql = `update public.personen
set auth_user_id = '<AUTH_USER_ID_FROM_DASHBOARD>'
where email = '<SEED_PERSON_EMAIL>';`;

export default function DevLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginState, setLoginState] = useState<DevLoginState>({
    status: "loading"
  });

  const refreshAuthState = useCallback(
    async (message: string | null = null) => {
      const context = await fetchCurrentSamzoContext();

      setLoginState({
        status: "ready",
        context,
        message
      });
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseBrowserClient();

    const initialRefresh = window.setTimeout(() => {
      refreshAuthState().catch((error: unknown) => {
        if (isMounted) {
          setLoginState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens ophalen van Auth status."
          });
        }
      });
    }, 0);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      refreshAuthState().catch((error: unknown) => {
        if (isMounted) {
          setLoginState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout na Auth statuswijziging."
          });
        }
      });
    });

    return () => {
      isMounted = false;
      window.clearTimeout(initialRefresh);
      subscription.unsubscribe();
    };
  }, [refreshAuthState]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      setPassword("");
      await refreshAuthState("Ingelogd met Supabase Auth.");
    } catch (error: unknown) {
      setLoginState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Onbekende fout tijdens inloggen."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        throw new Error(error.message);
      }

      await refreshAuthState("Uitgelogd uit deze browser sessie.");
    } catch (error: unknown) {
      setLoginState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Onbekende fout tijdens uitloggen."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const context = loginState.status === "ready" ? loginState.context : null;
  const user = context?.authUser ?? null;
  const isLoggedIn = Boolean(user);

  return (
    <section className="dev-login-page">
      <div className="dev-login-page__header">
        <p className="dev-login-page__eyebrow">Alleen ontwikkeling</p>
        <h1>Supabase dev-login</h1>
        <p>
          Gebruik deze tijdelijke beheerpagina om echte Supabase Auth-sessies te
          testen. Auth is nu de bron van waarheid; RLS bepaalt welke SAM&ZO data
          bij de gekoppelde persoon en profielen zichtbaar is.
        </p>
      </div>

      <div className="dev-login-grid">
        <form className="dev-login-card" onSubmit={handleLogin}>
          <h2>Inloggen</h2>
          <label>
            <span>E-mail</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="dev-user@example.test"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Wachtwoord</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Niet in code bewaren"
              required
              type="password"
              value={password}
            />
          </label>
          <div className="dev-login-actions">
            <button disabled={isSubmitting} type="submit">
              Inloggen
            </button>
            <button
              disabled={!isLoggedIn || isSubmitting}
              onClick={handleLogout}
              type="button"
            >
              Uitloggen
            </button>
          </div>
        </form>

        <section className="dev-login-card" aria-labelledby="auth-state">
          <h2 id="auth-state">Auth status</h2>
          {loginState.status === "loading" ? (
            <p>Auth status wordt opgehaald...</p>
          ) : null}
          {loginState.status === "error" ? (
            <p className="dev-login-error">{loginState.message}</p>
          ) : null}
          {loginState.status === "ready" ? (
            <dl className="dev-login-list">
              <div>
                <dt>Ingelogd</dt>
                <dd>{isLoggedIn ? "Ja" : "Nee"}</dd>
              </div>
              <div>
                <dt>Auth e-mail</dt>
                <dd>{user?.email ?? "Geen"}</dd>
              </div>
              <div>
                <dt>SAM&ZO persoon</dt>
                <dd>
                  {context?.persoon
                    ? `${context.persoon.accountnaam ?? context.persoon.email} (${context.persoon.systeemrol})`
                    : "Niet gekoppeld"}
                </dd>
              </div>
              <div>
                <dt>Actieve profielen</dt>
                <dd>
                  {context?.profielen.length
                    ? context.profielen
                        .map((profiel) => profiel.weergavenaam)
                        .join(", ")
                    : "Geen actief profiel gevonden"}
                </dd>
              </div>
              <div>
                <dt>Huidig profiel</dt>
                <dd>
                  {context?.currentProfiel?.weergavenaam ??
                    "Nog geen automatisch profiel"}
                </dd>
              </div>
            </dl>
          ) : null}
          {loginState.status === "ready" && user && !context?.persoon ? (
            <p className="dev-login-note">
              Auth-gebruiker is bekend, maar nog niet aan een SAM&ZO persoon
              gekoppeld.
            </p>
          ) : null}
          {loginState.status === "ready" &&
          context?.persoon &&
          context.profielen.length === 0 ? (
            <p className="dev-login-note">
              Persoon is gekoppeld, maar RLS geeft geen actief profiel terug.
            </p>
          ) : null}
          {loginState.status === "ready" && loginState.message ? (
            <p className="dev-login-note">{loginState.message}</p>
          ) : null}
        </section>
      </div>

      <section className="dev-login-card dev-login-card--wide">
        <h2>Lokale setup</h2>
        <ol className="dev-login-steps">
          <li>
            Maak in Supabase Dashboard een Auth user aan met een eigen tijdelijk
            wachtwoord. Bewaar dat wachtwoord niet in Git.
          </li>
          <li>
            Kopieer het id van de Auth-gebruiker uit het Dashboard en koppel die
            via SQL aan een seedpersoon.
          </li>
          <li>
            Log hier in met dat Auth account. Daarna gebruikt /planning dezelfde
            browser sessie en kan RLS current_profiel_id() bepalen.
          </li>
        </ol>
        <pre className="dev-login-sql">
          <code>{setupSql}</code>
        </pre>
      </section>
    </section>
  );
}
