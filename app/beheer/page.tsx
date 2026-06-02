import Link from "next/link";

export default function BeheerPage() {
  return (
    <section className="placeholder">
      <h1>Beheer</h1>
      <p>Beheer ondersteunt test- en diagnose-acties, los van de kern-applicatie.</p>
      <nav aria-label="Ontwikkelroutes">
        <ul>
          <li>
            <Link href="/beheer/dev-login">Supabase dev-login</Link>
          </li>
          <li>
            <Link href="/beheer/supabase-health">Supabase healthcheck</Link>
          </li>
        </ul>
      </nav>
    </section>
  );
}
