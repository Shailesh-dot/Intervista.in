import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Lenis from "lenis";
import { FiShield, FiLock, FiRefreshCw, FiMail, FiExternalLink } from "react-icons/fi";
import { BsShieldCheck } from "react-icons/bs";
import Navbar from "../../components/layout/Navbar";
import FooterSection from "../landing/FooterSection";

export default function PrivacypolicyPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const observer = useRef(null);

  // Initialize smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
    });
    return () => {
      lenis.destroy();
    };
  }, []);

  // Intersection Observer for scroll-spy
  useEffect(() => {
    const sectionIds = [
      "overview",
      "collect",
      "usage",
      "ai",
      "storage",
      "rights",
      "contact",
    ];

    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -70% 0px", // Trigger when section is in the top portion of viewport
        threshold: 0,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.current.observe(el);
    });

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120; // Offset for navbar and spacing
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const navItems = [
    { id: "overview", label: "Privacy Policy Overview" },
    { id: "collect", label: "1. Information We Collect" },
    { id: "usage", label: "2. Purpose of Data Usage" },
    { id: "ai", label: "3. AI & Third-Party Processing" },
    { id: "storage", label: "4. Data Storage & Retention" },
    { id: "rights", label: "6. User Rights" },
    { id: "contact", label: "9. Contact Information" },
  ];

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-[#4A4A4A]">
      <Navbar theme="light" />

      <main className="flex-grow w-full">
        {/* Header Section */}
        <div className="bg-[#0a1110] pt-38 pb-16 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
            <span className="inline-block px-4 py-1.5 border border-white/30 text-white text-[10px] font-bold uppercase tracking-widest rounded-full mb-6 bg-white/5 backdrop-blur-sm">
              Compliance & Security
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Privacy Policy - Intervista by Knitnet
            </h1>

            <div className="flex justify-start text-xs text-white/80 mt-10">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <span className="mx-2">&gt;</span>
              <span className="font-bold text-white">Privacy Policy</span>
            </div>
          </div>
          
          {/* Decorative Waves */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none opacity-40">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[60px]">
              <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="#FFFFFF"></path>
              <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-23.84V0Z" opacity=".5" fill="#FFFFFF"></path>
              <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="#FFFFFF"></path>
            </svg>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-20 flex flex-col md:flex-row gap-8 pb-20">
          
          {/* Left Sidebar - Sticky */}
          <div className="md:w-1/4 flex-shrink-0">
            <div className="sticky top-32 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-4">CONTENTS</h3>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <button 
                      key={item.id} 
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                        activeSection === item.id 
                          ? "bg-[#F5F6FD] text-[#3b3dbf] font-bold border-l-4 border-[#3b3dbf]" 
                          : "text-gray-500 hover:bg-gray-50 font-medium border-l-4 border-transparent"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="bg-[#F5F6FD] rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-2 text-[#3b3dbf] font-bold mb-3">
                  <BsShieldCheck className="w-5 h-5" />
                  Need help?
                </div>
                <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                  Have questions regarding your personal data or compliance? Our team is here to assist.
                </p>
                <Link to="/contact" className="block w-full bg-[#3b3dbf] hover:bg-[#3234A3] text-white font-bold text-xs py-2.5 rounded-lg transition-colors text-center">
                  Contact Here
                </Link>
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="md:w-3/4 bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100">
            
            {/* Overview */}
            <div id="overview" className="mb-12 scroll-mt-32">
              <h2 className="text-2xl font-bold text-[#3b3dbf] mb-6">Privacy Policy Overview</h2>
              <div className="space-y-4 text-sm leading-relaxed text-gray-600">
                <p>
                  At SecureVault, your privacy is a cornerstone of our relationship with you. This Privacy Policy describes how SecureVault and its affiliates collect, use, and share your personal data in connection with our website, applications, and services.
                </p>
                <p>
                  The types of Personal Data that we may collect while you use the SecureVault site are described in this section and include both information that you provide to us and information that we collect automatically when you use the site.
                </p>
                <p>
                  For purposes of this Privacy Notice, "Personal Data" means information that identifies you or that could reasonably be used to identify you. Examples include your name, address, telephone number, and email address.
                </p>
              </div>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* Section 1 */}
            <div id="collect" className="mb-12 scroll-mt-32">
              <h2 className="text-xl font-bold text-[#3b3dbf] mb-6">1. Information We Collect</h2>
              <p className="text-sm font-medium text-gray-800 mb-4">
                We collect information to provide better services to all our users. This includes:
              </p>
              <ul className="space-y-4 text-sm text-gray-600 mb-6">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf] mt-2 shrink-0"></div>
                  <div>
                    <strong className="text-gray-800">Personal Information:</strong> Direct identifiers such as full name, email address, postal address, and contact number provided during account registration.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf] mt-2 shrink-0"></div>
                  <div>
                    <strong className="text-gray-800">Resume & Career Data:</strong> Professional experience, education history, and skills uploaded for recruitment purposes.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf] mt-2 shrink-0"></div>
                  <div>
                    <strong className="text-gray-800">Identity Verification:</strong> Government-issued Aadhaar-based ID scans and biometric markers required for secure proctoring environments.
                  </div>
                </li>
              </ul>

              <div className="bg-[#F5F6FD] border border-[#3b3dbf] rounded-xl p-5 mb-8">
                <div className="flex items-center gap-2 text-xs font-bold text-[#3b3dbf] uppercase tracking-widest mb-2">
                  <FiLock className="w-4 h-4" /> SENSITIVE DATA WARNING
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  SecureVault handles sensitive personal data (such as biometric information) with enhanced security protocols. This data is encrypted at rest and in transit and is never shared with advertisers.
                </p>
              </div>

              <h3 className="text-base font-bold text-gray-800 mb-3">Audio & Proctoring Data</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                During active assessment sessions, we may collect audio recording and monitoring data to ensure the integrity of the evaluation. This information is processed locally where possible and stored in a highly secured environment.
              </p>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* Section 2 */}
            <div id="usage" className="mb-12 scroll-mt-32">
              <h2 className="text-xl font-bold text-[#3b3dbf] mb-6">2. Purpose of Data Usage</h2>
              <p className="text-sm text-gray-600 mb-6">
                We use the data we collect for the following essential purposes:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf]"></div>
                    Conduct AI-driven interview assessments
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf]"></div>
                    Provide downloadable reports (PDF/Excel)
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf]"></div>
                    Generate structured performance reports
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf]"></div>
                    Improve platform performance and functionality
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf]"></div>
                    Enable proctoring and candidate verification
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b3dbf]"></div>
                    Communicate interview details and updates
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* Section 3 */}
            <div id="ai" className="mb-12 scroll-mt-32">
              <h2 className="text-xl font-bold text-[#3b3dbf] mb-6">3. AI & Third-Party Processing</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Intervista utilizes advanced AI algorithms for automated scoring and identity verification. It utilizes AI technologies, including third-party APIs (e.g., Groq-based models). Data shared with such services is processed temporarily for evaluation purposes. We aim to minimize exposure of personally identifiable information.
              </p>
              <p className="text-[11px] text-gray-500 italic">
                *Third parties are contractually obligated to maintain the same level of data protection as outlined in this policy.
              </p>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* Section 4 */}
            <div id="storage" className="mb-12 scroll-mt-32">
              <h2 className="text-xl font-bold text-[#3b3dbf] mb-6">4. Data Storage & Retention</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                We store your data using Supabase infrastructure for as long as your account is active or as needed to provide you with our services. Data is stored securely using Supabase infrastructure. Sensitive raw data (snapshots, transcripts) is retained for up to 24 hours only. After processing, only final reports and scores are retained.
              </p>
              <div className="border-2 border-[#3b3dbf] rounded-xl p-5 bg-[#F5F6FD]/50">
                <div className="flex items-center gap-2 text-xs font-bold text-[#3b3dbf] uppercase tracking-widest mb-2">
                  <FiRefreshCw className="w-4 h-4" /> RETENTION NOTE
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Verification data (like ID photos) is typically deleted 30 days after the completion of the relevant assessment, regardless of account status.
                </p>
              </div>
            </div>

            <hr className="border-gray-100 mb-12" />

            {/* Section 6 */}
            <div id="rights" className="mb-12 scroll-mt-32">
              <h2 className="text-xl font-bold text-[#3b3dbf] mb-6">6. User Rights</h2>
              <p className="text-sm text-gray-600 mb-6">
                You have the following rights regarding your personal information:
              </p>
              <div className="space-y-0 border-t border-gray-100">
                {[
                  "Right to deletion of their data",
                  "Right to access generated reports",
                  "Right to Contact us regarding privacy concerns",
                  "Right to Data Portability"
                ].map((right, index) => (
                  <div key={index} className="flex items-center justify-between py-4 border-b border-gray-100">
                    <span className="text-sm text-gray-600 font-medium">{right}</span>
                    <span className="px-3 py-1 bg-gray-50 text-[10px] font-bold text-gray-600 rounded-full border border-gray-200">
                      Available
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 9 */}
            <div id="contact" className="bg-gray-50/50 border border-gray-200 border-dashed rounded-2xl p-8 text-center max-w-2xl mx-auto mt-16 scroll-mt-32">
              <h3 className="text-lg font-bold text-gray-800 mb-3">9. Contact Information</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-sm mx-auto">
                For any questions or concerns regarding this policy or our data practices, please reach out to our legal team directly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://mail.google.com/mail/?view=cm&to=teams@intervista.in&su=Privacy+Policy+Inquiry"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#3b3dbf] hover:bg-[#3234A3] text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors w-full sm:w-auto justify-center"
                >
                  <FiMail className="w-4 h-4" /> teams@intervista.in
                </a>
                <Link
                  to="/contact"
                  className="flex items-center gap-2 bg-white text-[#3b3dbf] text-sm font-medium py-2.5 px-6 rounded-lg transition-colors w-full sm:w-auto justify-center border border-gray-200 hover:bg-gray-50"
                >
                  Legal Help Center <FiExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
