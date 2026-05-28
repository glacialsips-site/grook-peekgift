'use client';

import { Component, type ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

interface State { failed: boolean }
interface Props { fallback: ReactNode; children: ReactNode }

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
