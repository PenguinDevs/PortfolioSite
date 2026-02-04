import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Jason Yi (@penguindevs)",
  description: "My portfolio site",
  icons: {
    icon: '/profile_picture.gif',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
