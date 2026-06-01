import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAM&ZO",
  description: "SAM&ZO app projectskelet"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
