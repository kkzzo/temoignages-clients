import './globals.css';

export const metadata = {
  title: "Elio's Wall of Fame — Client Testimonials",
  description: "Discover testimonials from our clients around the world. Over 200 authentic reviews in multiple languages.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
