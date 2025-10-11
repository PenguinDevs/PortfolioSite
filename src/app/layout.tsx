import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Jason Yi (@penguindevs) - Full Stack Developer',
  description:
    "Full-stack developer, computer science student, and hackathon winner. Creator of ValoTracker (Discord's #1 trending bot) and MACATHON 2025 winner. Programming since age 11.",
  keywords: [
    'Jason Yi',
    'PenguinDevs',
    'full-stack developer',
    'ValoTracker',
    'Discord bot',
    'Python',
    'Next.js',
    'hackathon winner',
    'Monash University',
    'competitive programming',
  ],
  authors: [{ name: 'Jason Yi', url: 'https://github.com/PenguinDevs' }],
  creator: 'Jason Yi (@penguindevs)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navigation />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
