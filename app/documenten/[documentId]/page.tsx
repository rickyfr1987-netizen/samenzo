"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  fetchDocumentById,
  formatDocumentStatus,
  type DocumentDetail,
  type DocumentenLink
} from "@/src/lib/documenten/items";
import {
  fetchCurrentSamzoContext,
  type CurrentSamzoContext
} from "@/src/lib/samzo/current-context";

type DocumentDetailState =
  | { status: "loading" }
  | {
      status: "ready";
      context: CurrentSamzoContext;
      document: DocumentDetail | null;
    }
  | { status: "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatDate(dateInput: string) {
  return dateFormatter.format(new Date(dateInput));
}

function getLinkedItemLabel(type: DocumentenLink["linkType"]) {
  if (type === "moment") {
    return "Moment";
  }

  if (type === "lijst") {
    return "Lijst";
  }

  return "Doel";
}

export default function DocumentDetailPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = useMemo(() => {
    const value = params.documentId;

    return Array.isArray(value) ? value[0] : value;
  }, [params.documentId]);

  const [detailState, setDetailState] = useState<DocumentDetailState>({
    status: "loading"
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDocumentDetail() {
      if (!documentId) {
        setDetailState({
          status: "error",
          message: "Geen document-id in route gevonden."
        });
        return;
      }

      try {
        const context = await fetchCurrentSamzoContext();

        if (!context.authUser) {
          if (isMounted) {
            setDetailState({
              status: "ready",
              context,
              document: null
            });
          }
          return;
        }

        const document = await fetchDocumentById(documentId);

        if (isMounted) {
          setDetailState({ status: "ready", context, document });
        }
      } catch (error: unknown) {
        if (isMounted) {
          setDetailState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Onbekende fout tijdens het laden van dit document."
          });
        }
      }
    }

    loadDocumentDetail();

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  const context = detailState.status === "ready" ? detailState.context : null;

  return (
    <section className="documenten-detail-page">
      <Link className="documenten-back-link" href="/documenten">
        Terug naar documenten
      </Link>

      {detailState.status === "loading" ? (
        <p className="documenten-state">Document laden...</p>
      ) : null}

      {detailState.status === "error" ? (
        <div className="documenten-state documenten-state--error" role="status">
          <h2>Document kon niet worden geladen</h2>
          <p>{detailState.message}</p>
        </div>
      ) : null}

      {detailState.status === "ready" && !detailState.context.authUser ? (
        <div className="documenten-state">
          <h2>Nog niet ingelogd</h2>
          <p>Log in via beheer om documenten te tonen.</p>
        </div>
      ) : null}

      {detailState.status === "ready" && detailState.context.authUser && !detailState.context.currentProfiel ? (
        <div className="documenten-state">
          <h2>Geen actief profiel</h2>
          <p>
            Je hebt nog geen gekoppeld actief SAM&ZO-profiel voor documentdetails.
          </p>
        </div>
      ) : null}

      {detailState.status === "ready" &&
      detailState.context.currentProfiel &&
      !detailState.document ? (
        <div className="documenten-state">
          <h2>Document niet zichtbaar</h2>
          <p>
            Dit document bestaat niet of is niet zichtbaar door huidige RLS.
          </p>
        </div>
      ) : null}

      {detailState.status === "ready" && detailState.document ? (
        <>
          <header className="documenten-detail-hero">
            <div className="documenten-card__meta">
              <span>{detailState.document.categoryName ?? "Geen categorie"}</span>
              <span>{formatDocumentStatus(detailState.document.status)}</span>
            </div>
            <h1>{detailState.document.title}</h1>
            {detailState.document.summary ? (
              <p>{detailState.document.summary}</p>
            ) : null}
            <p>
              Let op: dit is het informatieregime. Geen persoonlijke dossiers,
              geen zorgverslagen.
            </p>

            <dl className="documenten-card__facts">
              <div>
                <dt>Aangemaakt</dt>
                <dd>{formatDate(detailState.document.createdAt)}</dd>
              </div>
              <div>
                <dt>Gewijzigd</dt>
                <dd>
                  {formatDate(
                    detailState.document.updatedAt ?? detailState.document.createdAt
                  )}
                </dd>
              </div>
              <div>
                <dt>Groepszichtbaarheid</dt>
                <dd>
                  {detailState.document.groups.length === 0
                    ? "Niet expliciet gekoppeld"
                    : detailState.document.groups
                        .map((group) => group.name)
                        .join(", ")}
                </dd>
              </div>
            </dl>
          </header>

          <section className="documenten-detail-section" aria-label="Inhoud">
            <h2>Inhoud</h2>
            <article className="documenten-content">
              <p>{detailState.document.body}</p>
            </article>
          </section>

          <section className="documenten-detail-section">
            <h2>Groepen</h2>
            {detailState.document.groups.length === 0 ? (
              <p className="documenten-state">
                Geen expliciet gekoppelde groepen zichtbaar.
              </p>
            ) : (
              <ul className="documenten-badges">
                {detailState.document.groups.map((group) => (
                  <li key={group.id}>
                    <span>{group.name}</span>
                    <small>
                      {formatDocumentStatus(group.status)} ·{" "}
                      {formatDocumentStatus(group.visibility)}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="documenten-detail-section">
            <h2>Gerelateerde items</h2>
            {detailState.document.links.length === 0 ? (
              <p className="documenten-state">Geen gekoppelde items zichtbaar.</p>
            ) : (
              <ul className="documenten-links-list">
                {detailState.document.links.map((link) => (
                  <li key={link.id}>
                    <div>
                      <span>{getLinkedItemLabel(link.linkType)}</span>
                      {link.isVisible && link.href ? (
                        <Link href={link.href}>{link.title}</Link>
                      ) : (
                        <strong>{link.title}</strong>
                      )}
                    </div>
                    <div>
                      <small>
                        {link.status ? formatDocumentStatus(link.status) : "Onbekend"}
                      </small>
                      <small>
                        {link.isVisible ? "Zichtbaar" : "Beperkt zichtbaar"}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {detailState.status === "ready" ? (
        <section className="documenten-context" aria-label="Context">
          <div>
            <span>Huidige sessie</span>
            <strong>{context?.authUser ? "Ingelogd" : "Niet ingelogd"}</strong>
          </div>
          <div>
            <span>Profiel</span>
            <strong>
              {context?.currentProfiel?.weergavenaam ?? "Geen actief profiel"}
            </strong>
          </div>
        </section>
      ) : null}
    </section>
  );
}
