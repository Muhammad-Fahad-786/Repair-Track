// ─────────────────────────────────────────────────────────────
// RepairTrack — Home Page (Phase 2.2: Explanatory Landing Page)
// ─────────────────────────────────────────────────────────────

import HeroSection     from '../components/landing/HeroSection';
import TrustStrip      from '../components/landing/TrustStrip';
import HowItWorks      from '../components/landing/HowItWorks';
import PickupSection   from '../components/landing/PickupSection';
import TrackingSection  from '../components/landing/TrackingSection';
import WhyRepairTrack  from '../components/landing/WhyRepairTrack';
import ShopOwnerCTA    from '../components/landing/ShopOwnerCTA';
import FinalCTA        from '../components/landing/FinalCTA';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <HowItWorks />
      <PickupSection />
      <TrackingSection />
      <WhyRepairTrack />
      <ShopOwnerCTA />
      <FinalCTA />
    </>
  );
}
