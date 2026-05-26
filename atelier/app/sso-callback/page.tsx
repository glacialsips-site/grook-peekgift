'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/build"
        signUpFallbackRedirectUrl="/build"
      />
    </main>
  );
}
