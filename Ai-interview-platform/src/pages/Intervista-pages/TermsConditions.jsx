import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Lenis from "lenis";
import { FiPrinter, FiInfo, FiArrowRight, FiMail } from "react-icons/fi";
import Navbar from "../../components/layout/Navbar";
import FooterSection from "../landing/FooterSection";

export default function TermsConditions() {
  const [activeSection, setActiveSection] = useState("intro");
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
      "intro",
      "overview",
      "eligibility",
      "acceptable",
      "payment",
      "ai",
      "liability",
      "ip",
      "termination",
      "governing",
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
        rootMargin: "-20% 0px -70% 0px",
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
      const offset = 120;
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
    { id: "intro", label: "01 Introduction" },
    { id: "overview", label: "02 Platform Overview" },
    { id: "eligibility", label: "03 Eligibility" },
    { id: "acceptable", label: "04 Acceptable Use" },
    { id: "payment", label: "05 Payment Terms" },
    { id: "ai", label: "06 AI Disclaimer" },
    { id: "liability", label: "07 Limitation of Liability" },
    { id: "ip", label: "08 Intellectual Property" },
    { id: "termination", label: "09 Termination" },
    { id: "governing", label: "10 Governing Law" },
    { id: "contact", label: "11 Contact" },
  ];

  return (
    <div className="bg-[#F8F9FA] min-h-screen flex flex-col font-sans text-[#333333]">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-grow w-full pt-32 pb-20 print:pt-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-12 print:block">
          
          {/* Left Sidebar - Sticky */}
          <div className="md:w-1/4 flex-shrink-0 print:hidden">
            <div className="sticky top-32 space-y-6">
              <div>
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 ml-4">CONTENTS</h3>
                <nav className="space-y-0 bg-white rounded-xl border border-gray-200 overflow-hidden py-2 shadow-sm">
                  {navItems.map((item) => (
                    <button 
                      key={item.id} 
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-5 py-3.5 text-[13px] transition-all duration-300 flex items-center justify-between ${
                        activeSection === item.id 
                          ? "bg-[#F4F5F7] text-[#111111] font-bold border-l-4 border-gray-300" 
                          : "text-gray-500 hover:bg-gray-50 font-medium border-l-4 border-transparent"
                      }`}
                    >
                      <span>
                         <span className="text-gray-300 mr-2 font-normal text-xs">{item.label.split(' ')[0]}</span>
                         {item.label.substring(item.label.indexOf(' ') + 1)}
                      </span>
                      {activeSection === item.id && <FiArrowRight className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="bg-[#1e1e1e] text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2 text-white font-bold text-[11px] tracking-wider uppercase mb-3 relative z-10">
                  <FiInfo className="w-3.5 h-3.5" /> LEGAL NOTICE
                </div>
                <p className="text-xs text-gray-300 mb-6 leading-relaxed relative z-10">
                  These terms were last updated on last month 2026. We recommend reviewing them annually.
                </p>
                <button className="w-full bg-[#333333] hover:bg-[#444444] text-white font-medium text-xs py-2.5 rounded-lg transition-colors relative z-10">
                  View Version History
                </button>
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="md:w-3/4 print:w-full">
            
            <div className="mb-16 border-b border-gray-200 pb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FiInfo className="w-3.5 h-3.5" /> Legal Framework
                </div>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm print:hidden"
                >
                  <FiPrinter className="w-3.5 h-3.5" /> Print Page
                </button>
              </div>
              
              <h1 className="text-4xl md:text-[44px] font-bold text-[#111111] mb-1 tracking-tight leading-none">
                Terms & Conditions
              </h1>
              <h2 className="text-4xl md:text-[44px] font-bold text-gray-400 mb-6 tracking-tight leading-none">
                Intervista by Knitnet
              </h2>
              <div className="flex items-center gap-4 text-[11px] text-gray-400 font-medium">
                <span>⏱ Reading time: 12 - 15 mins</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              </div>
            </div>

            <div className="space-y-16">
              {/* Section 01 */}
              <div id="intro" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 01</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Introduction</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    Welcome to Intervista, a specialized AI-powered interview platform provided by Knitnet ("the Company"). By accessing or using our services, you agree to be bound by these Terms & Conditions. These terms constitute a legally binding agreement between you and Knitnet.
                  </p>
                  <p>
                    These Intervista Terms of Service (the "<strong className="text-gray-800">Agreement</strong>") are entered into by and between Knitnet and the entity or person placing an order for, or accessing, any Services ("<strong className="text-gray-800">Customer</strong>" or "<strong className="text-gray-800">you</strong>").
                  </p>
                </div>
              </div>

              {/* Section 02 */}
              <div id="overview" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 02</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Platform Overview</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    Intervista provides automated and semi-automated candidate interviewing tools powered by advanced Natural Language Processing and Generative AI. Our platform is designed to streamline recruitment pipelines by conducting initial screenings, technical assessments, and cultural fit analyses.
                  </p>
                  <p>
                    The platform includes access to our web-based dashboard, candidate interface, API integrations, and reporting tools as specified in your selected subscription tier.
                  </p>
                </div>
              </div>

              {/* Section 03 */}
              <div id="eligibility" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 03</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Eligibility</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    To use Intervista, you must be at least 18 years of age and have the legal capacity to enter into contracts. If you are using the platform on behalf of a corporate entity, you represent and warrant that you have the necessary authority to bind that entity to these terms.
                  </p>
                  <ul className="space-y-3 mt-4 ml-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 shrink-0"></div>
                      <span>Registration of an account with valid and accurate information is required.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 shrink-0"></div>
                      <span>Users must not have been previously suspended or removed from our services.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 shrink-0"></div>
                      <span>Compliance with all local employment laws in your jurisdiction is your sole responsibility.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 04 */}
              <div id="acceptable" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 04</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Acceptable Use</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    You agree to use Intervista only for lawful recruitment and human resources purposes. Prohibited activities include, but are not limited to:
                  </p>
                  <ul className="space-y-3 mt-4 ml-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 shrink-0"></div>
                      <span>Attempting to reverse-engineer or decompile any part of the AI interview engine.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 shrink-0"></div>
                      <span>Using the platform to discriminate against candidates based on protected characteristics.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 shrink-0"></div>
                      <span>Sharing account credentials or permitting unauthorized access to third parties.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 shrink-0"></div>
                      <span>Uploading malicious code or attempting to bypass security protocols.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 05 */}
              <div id="payment" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 05</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Payment Terms</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium mb-6">
                  <p>
                    Access to Intervista is provided on a subscription basis. All fees are non-refundable except as explicitly stated otherwise in a written service agreement.
                  </p>
                </div>
                <div className="bg-[#F8F9FA] border border-gray-200 rounded-xl p-6">
                  <h4 className="font-bold text-[13px] text-[#111111] mb-2">Standard Billing Cycles:</h4>
                  <p className="text-[12px] text-gray-500 leading-relaxed font-medium">
                    Subscription fees are billed in advance on a monthly or annual basis. Overages for candidate volume exceeding your tier limits will be billed in the subsequent billing cycle at the rates defined in our current pricing schedule.
                  </p>
                </div>
              </div>

              {/* Section 06 */}
              <div id="ai" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 06</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">AI Disclaimer</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    Intervista utilizes generative artificial intelligence to facilitate interviews and generate candidate insights. While we strive for maximum accuracy, AI-generated outputs should be used as one of many factors in a hiring decision.
                  </p>
                  <p className="font-bold italic text-gray-700">
                    Knitnet does not guarantee the accuracy of AI-generated summaries or predictions and is not responsible for any hiring decisions made based on platform data.
                  </p>
                </div>
              </div>

              {/* Section 07 */}
              <div id="liability" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 07</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Limitation of Liability</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    To the maximum extent permitted by law, Knitnet and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of Intervista.
                  </p>
                  <p>
                    In no event shall our total liability exceed the total amount paid by you to Knitnet for the services during the twelve (12) months preceding the event giving rise to the claim.
                  </p>
                </div>
              </div>

              {/* Section 08 */}
              <div id="ip" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 08</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Intellectual Property</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    The Intervista platform, including all algorithms, user interface designs, and branding, is the exclusive property of Knitnet. You are granted a limited, non-exclusive, non-transferable license to use the platform for its intended purpose.
                  </p>
                  <p>
                    Any feedback or suggestions provided by users regarding the platform may be used by Knitnet without compensation or obligation to the provider.
                  </p>
                </div>
              </div>

              {/* Section 09 */}
              <div id="termination" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 09</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Termination</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    You may terminate your account at any time via the dashboard settings. Knitnet reserves the right to suspend or terminate access immediately if these terms are violated or if continued use poses a security risk to the platform.
                  </p>
                </div>
              </div>

              {/* Section 10 */}
              <div id="governing" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 10</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Governing Law</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    These Terms & Conditions shall be governed by and construed in accordance with the laws of the jurisdiction in which Knitnet is headquartered, without regard to its conflict of law principles.
                  </p>
                  <p className="text-gray-800">
                    Jurisdiction: Chennai, Tamil Nadu
                  </p>
                </div>
              </div>

              {/* Section 11 */}
              <div id="contact" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">SECTION 11</span>
                  <h3 className="text-[22px] font-bold text-[#111111]">Contact</h3>
                </div>
                <div className="space-y-4 text-[13px] leading-relaxed text-gray-600 font-medium">
                  <p>
                    For questions regarding these Terms & Conditions or for legal inquiries, please contact our compliance team:
                  </p>
                  <div className="flex items-center gap-3 mt-6">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-600 shrink-0">
                      <FiMail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#111111]">Legal Department</div>
                      <a href="mailto:teams@intervista.in" className="text-[12px] text-blue-500 hover:underline">teams@intervista.in</a>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Bottom Box */}
              <div className="mt-24 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm print:hidden">
                <div>
                  <h4 className="text-[15px] font-bold text-[#111111] mb-1">Have questions about these terms?</h4>
                  <p className="text-[13px] text-gray-500 font-medium">Our legal team is happy to help clarify any clauses.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <button className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors">
                    Contact Support
                  </button>
                  <button className="w-full sm:w-auto px-6 py-2.5 bg-[#1e1e1e] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md">
                    Accept and Continue <FiArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <FooterSection />
      </div>
    </div>
  );
}
