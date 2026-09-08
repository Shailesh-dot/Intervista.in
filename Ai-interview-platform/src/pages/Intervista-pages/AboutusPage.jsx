import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Lenis from "lenis";
import { FiInfo, FiTarget, FiUsers, FiLayers, FiArrowRight } from "react-icons/fi";
import { BsGlobe, BsShieldCheck, BsLightningCharge } from "react-icons/bs";
import Navbar from "../../components/layout/Navbar";
import FooterSection from "../landing/FooterSection";

export default function AboutusPage() {
  // Initialize smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
    });
    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-900">
      <Navbar theme="light" />

      {/* Hero Image Section - Handshake Background */}
      <section className="relative w-full h-[70vh] min-h-[500px] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2000&auto=format&fit=crop" 
            alt="About Intervista Hero" 
            className="w-full h-full object-cover object-center"
          />
          {/* Professional Overlay */}
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 flex flex-col items-center justify-center text-white text-center mt-12"
        >
          <span className="text-[20px] font-bold tracking-[0.2em] mb-4 uppercase drop-shadow-md">About Us</span>
          <h1 className="text-6xl md:text-[80px] font-medium font-serif tracking-tight drop-shadow-lg leading-none">
            About Intervista
          </h1>
          <p className="text-xl text-white/80 mt-6 max-w-2xl px-6 drop-shadow-md">
            Modernizing hiring ecosystems through intelligent, scalable, and fair evaluation platforms.
          </p>
        </motion.div>
      </section>

      <main className="flex-grow pt-20 pb-20 px-6 max-w-6xl mx-auto w-full">
        {/* Badges Section */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 text-[#8E8E93] text-xs font-bold uppercase tracking-widest mb-24">
          <div className="flex items-center gap-2">
            <BsGlobe className="w-4 h-4" />
            GLOBAL REACH
          </div>
          <div className="flex items-center gap-2">
            <BsShieldCheck className="w-4 h-4" />
            TRUSTED SECURITY
          </div>
          <div className="flex items-center gap-2">
            <BsLightningCharge className="w-4 h-4" />
            INSTANT RESULTS
          </div>
        </div>



        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
          {/* Card 1: About Intervista */}
          <div className="bg-white rounded-3xl p-10 border border-[#F2F2F7] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F0] flex items-center justify-center text-[#FF3B30]">
                <FiInfo className="w-5 h-5" />
              </div>
              <span className="px-3 py-1 bg-[#FFF0F0] text-[#FF3B30] text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#FFE0E0]">
                Intervista Core
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">About Intervista</h3>
            <div className="w-8 h-0.5 bg-[#FF3B30] mb-6"></div>
            <p className="text-[#636366] leading-relaxed text-[15px]">
              Intervista is a complete end-to-end interview platform designed to modernize and simplify hiring and interview preparation. The platform combines AI-assisted evaluation, structured assessments, and monitoring systems to create a reliable and scalable interview environment.
            </p>
          </div>

          {/* Card 2: Our Vision */}
          <div className="bg-white rounded-3xl p-10 border border-[#F2F2F7] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F0] flex items-center justify-center text-[#FF3B30]">
                <FiTarget className="w-5 h-5" />
              </div>
              <span className="px-3 py-1 bg-[#FFF0F0] text-[#FF3B30] text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#FFE0E0]">
                Intervista Core
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">Our Vision</h3>
            <div className="w-8 h-0.5 bg-[#FF3B30] mb-6"></div>
            <p className="text-[#636366] leading-relaxed text-[15px] italic font-medium">
              "To enable efficient, scalable, and data-driven evaluation systems."
            </p>
          </div>

          {/* Card 3: Target Users */}
          <div className="bg-white rounded-3xl p-10 border border-[#F2F2F7] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F0] flex items-center justify-center text-[#FF3B30]">
                <FiUsers className="w-5 h-5" />
              </div>
              <span className="px-3 py-1 bg-[#FFF0F0] text-[#FF3B30] text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#FFE0E0]">
                Intervista Core
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">Target Users</h3>
            <div className="w-8 h-0.5 bg-[#FF3B30] mb-6"></div>
            <ul className="space-y-4 text-[15px] text-[#636366]">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]"></div>
                HR teams conducting recruitment
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]"></div>
                Students preparing for interviews
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]"></div>
                Job seekers at fresher level
              </li>
            </ul>
          </div>

          {/* Card 4: Key Offerings */}
          <div className="bg-white rounded-3xl p-10 border border-[#F2F2F7] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F0] flex items-center justify-center text-[#FF3B30]">
                <FiLayers className="w-5 h-5" />
              </div>
              <span className="px-3 py-1 bg-[#FFF0F0] text-[#FF3B30] text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#FFE0E0]">
                Intervista Core
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">Key Offerings</h3>
            <div className="w-8 h-0.5 bg-[#FF3B30] mb-6"></div>
            <ul className="space-y-4 text-[15px] text-[#636366]">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]"></div>
                AI-assisted interview system
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]"></div>
                Structured assessment modules
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]"></div>
                Performance analytics and reporting
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-[#1A1A1A] rounded-[40px] p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 mb-24">
          <div className="md:w-2/3">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to transform your interview process?
            </h2>
            <p className="text-[#AEAEB2] text-lg leading-relaxed">
              Join hundreds of organizations using Intervista to find the best talent faster through data-driven insights.
            </p>
          </div>
          <div className="md:w-1/3 flex flex-col sm:flex-row items-center gap-4 w-full">
            <Link to="/contact" className="w-full sm:w-auto px-8 py-4 bg-[#FF3B30] hover:bg-[#E6352B] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              Contact <FiArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-5 py-4 bg-white hover:bg-gray-50 text-[#1A1A1A] font-bold rounded-xl transition-colors text-center">
              Book a Demo
            </Link>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
