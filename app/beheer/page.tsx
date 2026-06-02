export default function BeheerPage() {
  return (
    <section className="placeholder">
      <h1>Beheer</h1>
      <p>Placeholder voor de gescheiden beheerlaag. Geen functionele app-logica in Slice 0.</p>
      <nav aria-label="Ontwikkelroutes">
        <ul>
          <li>
            <a href="/beheer/dev-login">Supabase dev-login</a>
          </li>
          <li>
            <a href="/beheer/supabase-health">Supabase healthcheck</a>
          </li>
        </ul>
      </nav>
    </section>
  );
}
