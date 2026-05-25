'use client';

import { Component, type ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

interface State { failed: boolean }
interface Props { fallback: ReactNode; children: ReactNode }

// Catches Clerk's client-init throws (unauthorized origin, network, bad key)
// and falls back to rendering the same children WITHOUT the ClerkProvider
// wrapper so the rest of the page still hydrates. Protected pages will still
// 401 server-side (intended). Public pages stay alive.
class ClerkErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[clerk-boundary]', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function ClerkBoundary({
  publishableKey,
  children
}: {
  publishableKey?: string;
  children: ReactNode;
}) {
  if (!publishableKey) return <>{children}</>;
  return (
    <ClerkErrorBoundary fallback={<>{children}</>}>
      <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
    </ClerkErrorBoundary>
  );
}
