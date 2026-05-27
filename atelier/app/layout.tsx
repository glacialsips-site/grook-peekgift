import type { Metadata, Viewport } from 'next';
import {
  Caveat,
  Cormorant_Garamond,
  DM_Mono,
  Fraunces,
  Inter,
  Playfair_Display,
} from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-body-serif',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const APP_URL = env.APP_URL.replace(/\/+$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'peek.gift',
    template: '%s · peek.gift',
  },
  description: 'Make gift giving real again.',
  applicationName: 'peek.gift',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'peek.gift',
    title: 'peek.gift',
    description: 'Make gift giving real again.',
    url: APP_URL,
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'peek.gift — make gift giving real again',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'peek.gift',
    description: 'Make gift giving real again.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0E12' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'peek.gift',
    url: APP_URL,
    logo: `${APP_URL}/icon-512.png`,
    description: 'Make gift giving real again.',
  };

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            inter.variable,
            playfair.variable,
            fraunces.variable,
            dmMono.variable,
            caveat.variable,
            cormorant.variable,
            'min-h-[100dvh] bg-background text-foreground antialiased',
          )}
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
          >
            Skip to main content
          </a>
          <Providers>
            {children}
            <Toaster />
          </Providers>
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
