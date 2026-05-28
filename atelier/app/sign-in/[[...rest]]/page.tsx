import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { CustomSignInForm } from '@/components/auth/custom-sign-in-form';

export default function Page() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to keep making peeks."
      ariaLabel="Sign in"
      footer={
        <span>
          New here?{' '}
          <Link
            href="/sign-up"
            className="inline-block min-h-11 py-2.5 text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </span>
      }
    >
      <CustomSignInForm />
    </AuthCard>
  );
}
