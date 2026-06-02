import Link from "next/link";

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
      <h1>SAM&ZO</h1>
      <p>
        Basisoverzicht van routes voor persoonlijke, gezamenlijke en
        praktische overzichtspagina&apos;s.
      </p>
      <nav aria-label="Skelet routes">
        <ul>
          {routes.map((route) => (
            <li key={route.href}>
              <Link href={route.href}>{route.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
