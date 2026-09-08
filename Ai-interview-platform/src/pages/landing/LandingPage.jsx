import { useEffect } from "react";
import Lenis from "lenis";
import Navbar from "../../components/layout/Navbar";
 

import HeroSection from "./HeroSection";
import ProblemSection from "./ProblemSection";
import SolutionSection from "./SolutionSection";
import FeaturesSection from "./FeaturesSection";
import WorkflowSection from "./WorkflowSection";
import PlatformAdvantages from "./PlatformAdvantages";
import SecuritySection from "./SecuritySection";
import TargetUsersSection from "./TargetUsersSection";
import TakeTestCTA from "./TakeTestCTA";
import CollaborationSection from "./CollaborationSection";
import FooterSection from "./FooterSection";

export default function LandingPage() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="App w-full min-h-screen overflow-x-hidden">

      <Navbar />

      <HeroSection />

      <ProblemSection />

      <SolutionSection />

      <FeaturesSection />

      <WorkflowSection />

      <PlatformAdvantages />

      {/* <SecuritySection /> */}

      {/* <TargetUsersSection /> */}

      {/* <TakeTestCTA /> */}

      <CollaborationSection />

      <FooterSection />

    </div>
  );
}