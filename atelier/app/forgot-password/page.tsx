import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function Page() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a 6-digit code."
      footer={
        <span>
          Remembered it?{' '}
          <Link
            href="/sign-in"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </span>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
