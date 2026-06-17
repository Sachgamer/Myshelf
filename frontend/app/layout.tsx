import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyShelf - Collection de films, séries et DVD",
  description: "Répertoire personnel pour noter vos films et séries vus, et gérer votre collection de DVD.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

