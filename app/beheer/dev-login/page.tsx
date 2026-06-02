"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchCurrentSamzoIdentity,
  type CurrentSamzoIdentity
} from "@/src/lib/dev/auth-context";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/client";

import type { User } from "@supabase/supabase-js";

type DevLoginState =
  | { status: "loading" }
  | {
      status: "ready";
      user: User | null;
      identity: CurrentSamzoIdentity;
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
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw new Error(error.message);
      }

      const user = data.session?.user ?? null;
      const identity = await fetchCurrentSamzoIdentity(user?.id ?? null);

      setLoginState({
        status: "ready",
        user,
        identity,
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

  const user = loginState.status === "ready" ? loginState.user : null;
  const identity =
    loginState.status === "ready" ? loginState.identity : null;
  const isLoggedIn = Boolean(user);

  return (
    <section className="dev-login-page">
      <div className="dev-login-page__header">
        <p className="dev-login-page__eyebrow">Alleen ontwikkeling</p>
        <h1>Supabase dev-login</h1>
        <p>
          Gebruik deze tijdelijke beheerpagina om met echte Supabase Auth
          sessies te testen. De frontend gebruikt alleen de publieke anon key;
          RLS blijft bepalen welke SAM&ZO data zichtbaar is.
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
                <dt>Auth user id</dt>
                <dd>{user?.id ?? "Geen"}</dd>
              </div>
              <div>
                <dt>SAM&ZO persoon</dt>
                <dd>
                  {identity?.persoon
                    ? `${identity.persoon.accountnaam ?? identity.persoon.email} (${identity.persoon.systeemrol})`
                    : "Niet gekoppeld"}
                </dd>
              </div>
              <div>
                <dt>SAM&ZO profiel</dt>
                <dd>{identity?.profiel?.weergavenaam ?? "Niet gevonden"}</dd>
              </div>
            </dl>
          ) : null}
          {loginState.status === "ready" && user && !identity?.persoon ? (
            <p className="dev-login-note">
              Auth user bestaat, maar personen.auth_user_id is nog niet aan
              deze user id gekoppeld.
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
            Kopieer de Auth user id uit Dashboard en koppel die aan precies een
            seedpersoon via SQL.
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
