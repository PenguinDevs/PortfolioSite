import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Jason Yi (@penguindevs)",
  description: "My portfolio site",
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "Jason Yi (@penguindevs)",
    description: "My portfolio site",
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Jason Yi (@penguindevs)",
    description: "My portfolio site",
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="darkreader-lock" />
      </head>
      <body>{children}</body>
    </html>
  );
}
