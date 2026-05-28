import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const host = env.APP_URL.replace(/\/+$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/build/',
          '/sign-in/',
          '/sign-up/',
          '/sso-callback',
        ],
      },
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  };
}
