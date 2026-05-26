import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { CustomSignUpForm } from '@/components/auth/custom-sign-up-form';

export default function Page() {
  return (
    <AuthCard
      title="Make it real"
      subtitle="Create an account to start your first peek."
      ariaLabel="Sign up"
      footer={
        <span>
          Already have an account?{' '}
          <Link
            href="/sign-in"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <CustomSignUpForm />
    </AuthCard>
  );
}
