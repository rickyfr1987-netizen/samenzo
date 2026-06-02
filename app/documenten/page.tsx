"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchVisibleDocumenten,
  formatDocumentStatus,
  type DocumentSummary
} from "@/src/lib/documenten/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";

type DocumentenState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      documents: DocumentSummary[];
    }
  | { status: "error"; message: string };

export default function DocumentenPage() {
  const [documenten, setDocumenten] = useState<DocumentenState>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDocumenten() {
      try {
        const context = await fetchCurrentSamzoContext();
        if (!context.authUser) {
          if (isMounted) {
            setDocumenten({ status: "ready", context, documents: [] });
          }
          return;
        }

        const documents = await fetchVisibleDocumenten();

        if (isMounted) {
          setDocumenten({ status: "ready", context, documents });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setDocumenten({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van documenten."
          });
        }
      }
    }

    loadDocumenten();

    return () => {
      isMounted = false;
    };
  }, []);

  const context = documenten.status === "ready" ? documenten.context : null;

  return (
    <section className="documenten-page">
      <div className="documenten-page__header">
        <p className="documenten-page__eyebrow">Documenten informeren</p>
        <h1>Documenten</h1>
        <p>
          Documenten informeren. Dit is geen persoonlijke dossierruimte of
          zorgregistratie: geen chat, geen persoonlijke notities, geen acties.
        </p>
      </div>

      <section className="documenten-context" aria-label="Huidige context">
        <div>
          <span>Auth</span>
          <strong>{context?.authUser ? "Ingelogd" : "Niet ingelogd"}</strong>
        </div>
        <div>
          <span>Profiel</span>
          <strong>
            {context?.currentProfiel?.weergavenaam ?? "Geen actief gekoppeld profiel"}
          </strong>
        </div>
      </section>

      {documenten.status === "loading" ? (
        <p className="documenten-state">Documenten laden...</p>
      ) : null}

      {documenten.status === "error" ? (
        <div className="documenten-state documenten-state--error" role="status">
          <h2>Documenten konden niet worden geladen</h2>
          <p>{documenten.message}</p>
        </div>
      ) : null}

      {documenten.status === "ready" && !documenten.context.authUser ? (
        <div className="documenten-state">
          <h2>Nog niet ingelogd</h2>
          <p>Log in via beheer om documenten door RLS te laten bepalen.</p>
        </div>
      ) : null}

      {documenten.status === "ready" &&
      documenten.context.authUser &&
      !documenten.context.currentProfiel ? (
        <div className="documenten-state">
          <h2>Geen actief profiel</h2>
          <p>
            De ingelogde gebruiker heeft nog geen gekoppeld actueel profiel voor deze
            documentenlijst.
          </p>
        </div>
      ) : null}

      {documenten.status === "ready" &&
      documenten.context.authUser &&
      documenten.context.currentProfiel &&
      documenten.documents.length === 0 ? (
        <div className="documenten-state">
          <h2>Geen documenten zichtbaar</h2>
          <p>
            Er zijn op dit moment geen documenten te zien voor deze sessie.
          </p>
        </div>
      ) : null}

      {documenten.status === "ready" && documenten.documents.length > 0 ? (
        <div className="documenten-grid">
          {documenten.documents.map((document) => (
            <Link
              className="documenten-card-link"
              href={`/documenten/${document.id}`}
              key={document.id}
            >
              <article className="documenten-card">
                <div className="documenten-card__meta">
                  <span>{document.categoryName ?? "Geen categorie"}</span>
                  <span>{formatDocumentStatus(document.status)}</span>
                </div>
                <h2>{document.title}</h2>
                {document.summary ? <p>{document.summary}</p> : null}
                <dl className="documenten-card__facts">
                  <div>
                    <dt>Status</dt>
                    <dd>{formatDocumentStatus(document.status)}</dd>
                  </div>
                  <div>
                    <dt>Groepen</dt>
                    <dd>
                      {document.groups.length === 0
                        ? "Geen expliciet groepstoezicht"
                        : document.groups
                            .map((group) => group.name)
                            .join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Gewijzigd</dt>
                    <dd>
                      {new Date(
                        document.updatedAt ?? document.createdAt
                      ).toLocaleString("nl-NL")}
                    </dd>
                  </div>
                </dl>
                <p className="documenten-card__open">Open document</p>
              </article>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
