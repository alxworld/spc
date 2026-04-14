import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/landing/HeroSection";
import WhoWeAreSection from "@/components/landing/WhoWeAreSection";
import TeamSection from "@/components/landing/TeamSection";
import RegisterCTASection from "@/components/landing/RegisterCTASection";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <WhoWeAreSection />
        <TeamSection />
        <RegisterCTASection />
      </main>
      <Footer />
    </>
  );
}
