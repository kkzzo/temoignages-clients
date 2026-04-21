import './globals.css';

export const metadata = {
  title: "Elio's Wall of Fame — Témoignages Clients",
  description: "Découvrez les témoignages de nos clients à travers le monde. Plus de 200 retours d'expérience authentiques en plusieurs langues.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
