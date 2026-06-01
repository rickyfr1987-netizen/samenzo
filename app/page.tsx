const routes = [
  { href: "/mijn-dag", label: "Mijn dag" },
  { href: "/planning", label: "Planning" },
  { href: "/lijsten", label: "Lijsten" },
  { href: "/documenten", label: "Documenten" },
  { href: "/doelen", label: "Doelen" },
  { href: "/leden", label: "Leden" },
  { href: "/tijdlijn", label: "Tijdlijn" },
  { href: "/beheer", label: "Beheer" }
];

export default function HomePage() {
  return (
    <section className="placeholder">
      <h1>SAM&ZO projectskelet</h1>
      <p>Slice 0 bevat alleen lege routes en structuur. Er is nog geen app-logica.</p>
      <nav aria-label="Skelet routes">
        <ul>
          {routes.map((route) => (
            <li key={route.href}>
              <a href={route.href}>{route.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
