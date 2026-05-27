import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Showcase } from '@/components/landing/showcase';
import { WhyDifferent } from '@/components/landing/why-different';
import { FinalCta } from '@/components/landing/final-cta';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function Home() {
  return (
    <main id="main" className="flex flex-col">
      <Hero />
      <HowItWorks />
      <Showcase />
      <WhyDifferent />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}
