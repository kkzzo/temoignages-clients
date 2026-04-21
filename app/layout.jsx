import './globals.css';
import VideoProtection from '@/components/VideoProtection';

export const metadata = {
  title: "Elio's Wall of Fame — Client Testimonials",
  description: "Discover testimonials from our clients around the world. Over 200 authentic reviews in multiple languages.",
  // Prevent caching of page (reduces network tab leakage)
  other: { 'Cache-Control': 'no-store' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Block search engine indexing of video data */}
        <meta name="robots" content="noindex, nofollow" />
        {/* Prevent referrer leakage */}
        <meta name="referrer" content="no-referrer" />
      </head>
      <body>
        <VideoProtection />
        {children}
      </body>
    </html>
  );
}
