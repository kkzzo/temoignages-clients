import './globals.css';

export const metadata = {
  title: 'Témoignages clients',
  description: 'Retours d\'expérience de nos clients',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
