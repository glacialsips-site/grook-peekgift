import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'peek.gift',
  description: 'Build a gift page they actually pick from.',
  icons: { icon: '/favicon.svg' }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f0f10'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-dvh chrome-bg">{children}</body>
      </html>
    </ClerkProvider>
  );
}
