import './globals.css';
import type { Metadata, Viewport } from 'next';
import ClerkBoundary from './ClerkBoundary';

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
    <html lang="en">
      <body className="min-h-dvh chrome-bg">
        <ClerkBoundary publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
          {children}
        </ClerkBoundary>
      </body>
    </html>
  );
}
