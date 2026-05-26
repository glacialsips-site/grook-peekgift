import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <main
      id="main"
      className="flex min-h-[100dvh] items-center justify-center p-6"
      aria-label="Sign up"
    >
      <SignUp />
    </main>
  );
}
