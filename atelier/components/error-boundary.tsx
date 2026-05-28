'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/logger';

type FallbackRender = (args: {
  error: Error;
  reset: () => void;
}) => ReactNode;

type Props = {
  children: ReactNode;
  fallback: ReactNode | FallbackRender;
  label?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('client_error_boundary', {
      label: this.props.label,
      message: error.message,
      componentStack: info.componentStack,
    });
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback({ error, reset: this.reset });
      }
      return fallback;
    }
    return this.props.children;
  }
}
