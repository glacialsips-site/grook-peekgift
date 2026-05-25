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
  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const body = <body className="min-h-dvh chrome-bg">{children}</body>;
  // Only mount ClerkProvider when we have a publishable key — otherwise the
  // provider tries to fetch Clerk's frontend API and throws.
  return (
    <html lang="en">
      {pubKey ? <ClerkProvider publishableKey={pubKey}>{body}</ClerkProvider> : body}
    </html>
  );
}
