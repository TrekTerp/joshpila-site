import type { Metadata } from "next";
import { sectionMetadata } from "./section-metadata";
import "./globals.css";
import { CabinetTransitionProvider } from "./cabinet-transition";

export const metadata: Metadata = {
  title: "Josh Pila · Orrery",
  description: "Astronomy, D&D, games, mathematics, writing, cooking, and things I make.",
  icons: sectionMetadata("home", "Orrery").icons,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><CabinetTransitionProvider>{children}</CabinetTransitionProvider></body>
    </html>
  );
}
