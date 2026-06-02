import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAM&ZO",
  description: "SAM&ZO overzichtsapp met planning, lijsten, documenten, doelen, leden en tijdlijn"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <div className="app-shell">
          <AppHeader />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
