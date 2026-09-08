import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Lenis from "lenis";
import { FiCheck } from "react-icons/fi";
import { MdOutlineSpaceDashboard, MdOutlineFileDownload, MdOutlineVerifiedUser } from "react-icons/md";
import { BsCreditCard, BsLightningCharge } from "react-icons/bs";
import Navbar from "../../components/layout/Navbar";
import FooterSection from "../landing/FooterSection";

export default function PricingPage() {
  // Initialize smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
    });
    return () => {
      lenis.destroy();
    };
  }, []);

  const individualPlans = [
    {
      name: "Basic Plans",
      description: "Ideal for foundational skill validation.",
      price: 178,
      features: ["Aptitude Test - ₹79", "AI HR Interview - ₹99"],
      ctaText: "Get Started",
      popular: false,
    },
    {
      name: "Intermediate",
      description: "Technical and communication mastery.",
      price: 190,
      features: ["Coding Assessment - ₹120", "Verbal Assessment - ₹70"],
      ctaText: "Get Started",
      popular: false,
    },
    {
      name: "Combined",
      description: "The complete synergy for job seekers.",
      price: 448,
      features: ["Coding + AI HR Interview - ₹199", "Aptitude + Verbal + AI HR - ₹249"],
      ctaText: "Get Started",
      popular: false,
    },
    {
      name: "Full Assessment",
      description: "The ultimate benchmark for elite roles.",
      price: 299,
      features: ["Aptitude + Coding + Verbal + AI HR - ₹299"],
      ctaText: "Take Full Assessment",
      popular: true,
    },
  ];

  const features = [
    {
      icon: <MdOutlineSpaceDashboard className="w-6 h-6 text-green-600" />,
      title: "Performance Dashboard",
      description: "Real-time analytics of your skills.",
    },
    {
      icon: <MdOutlineFileDownload className="w-6 h-6 text-green-600" />,
      title: "Downloadable Reports",
      description: "Available in professional PDF & Excel.",
    },
    {
      icon: <MdOutlineVerifiedUser className="w-6 h-6 text-green-600" />,
      title: "Complete Interview Experience",
      description: "Simulated high-stakes environment.",
    },
  ];

  const creditConsumption = [
    { name: "Aptitude Assessment", credits: 79 },
    { name: "Coding Assessment", credits: 120 },
    { name: "Verbal Assessment", credits: 70 },
    { name: "AI HR Interview", credits: 99 },
  ];

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-900">
      <Navbar />

      <main className="flex-grow pt-32 pb-24 px-6 max-w-7xl mx-auto w-full">
        {/* Individual Plans Section */}
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-[#EEF8F1] text-[#2E8B57] text-xs font-bold uppercase tracking-widest rounded-full mb-6">
            PERSONAL GROWTH
          </span>
          <h1 className="text-4xl md:text-[44px] font-black tracking-tight mb-4">
            Plans for Individual Users
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Expertly crafted assessments to sharpen your professional edge. Choose the focus area that fits your current career goals.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {individualPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? "border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] mt-[-10px] pb-10"
                  : "border border-gray-100 shadow-sm"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2E8B57] text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                  MOST POPULAR
                </div>
              )}
              
              <div className="text-center flex-grow">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 min-h-[40px] mb-8 leading-relaxed">
                  {plan.description}
                </p>

                <div className="mb-8">
                  <div className="flex items-center justify-center font-black">
                    <span className="text-2xl text-[#2E8B57] mr-1">₹</span>
                    <span className="text-[54px] tracking-tight leading-none">{plan.price}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">per assessment</p>
                </div>

                <div className="w-full h-px bg-gray-100 mb-8"></div>

                <div className="text-left mb-10">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    INCLUDES:
                  </p>
                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#EEF8F1] flex items-center justify-center shrink-0 mt-0.5">
                          <FiCheck className="text-[#2E8B57] w-3 h-3" strokeWidth={3} />
                        </div>
                        <span className="text-sm text-gray-600 font-medium leading-tight">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                className={`w-full py-3.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center transition-colors ${
                  plan.popular
                    ? "bg-[#2E8B57] text-white hover:bg-[#236F45]"
                    : "bg-[#F3F4F6] text-gray-800 hover:bg-gray-200"
                }`}
              >
                {plan.ctaText}
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
          {features.map((feat, index) => (
            <div key={index} className="border border-gray-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm bg-white">
              <div className="w-12 h-12 rounded-xl border border-gray-100 flex items-center justify-center shrink-0 bg-gray-50">
                {feat.icon}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-1">{feat.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Credit Based Model Section */}
        <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-sm">
          {/* Left Side */}
          <div className="bg-[#F8FDF9] p-10 md:p-14 md:w-5/12 flex flex-col justify-center border-r border-gray-100">
            <span className="inline-block px-3 py-1 bg-white border border-green-100 text-[#2E8B57] text-[10px] font-bold uppercase tracking-widest rounded-full mb-6 w-max">
              FOR ORGANIZATIONS (HRS)
            </span>
            <h2 className="text-3xl font-black mb-4 tracking-tight leading-tight">Credit-Based<br />Model</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-10">
              A flexible, scalable way to manage high-volume hiring. Buy credits once and use them across any candidate assessment type.
            </p>

            <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#EEF8F1] flex items-center justify-center text-[#2E8B57] shrink-0">
                <BsLightningCharge className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-xl tracking-tight">1 Credit = ₹1</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">FIXED EXCHANGE RATE</div>
              </div>
            </div>

            <div className="bg-[#EBF7EF] border border-[#D5EEDD] rounded-xl p-5">
              <div className="flex items-center gap-2 text-[#2E8B57] font-bold text-[10px] uppercase tracking-widest mb-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                EXAMPLE CALCULATION
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Aptitude + Coding + AI HR = <strong className="text-[#2E8B57]">298 Credits</strong> per candidate.
              </p>
            </div>
          </div>

          {/* Right Side */}
          <div className="p-10 md:p-14 md:w-7/12 bg-white flex flex-col justify-center">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-8">
              <BsCreditCard className="text-[#2E8B57]" />
              Credit Consumption per Candidate
            </h3>

            <div className="space-y-0 mb-10">
              {creditConsumption.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A3D2B5]"></div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {item.credits} <span className="text-xs font-normal text-gray-400">Credits</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full h-px bg-gray-100 mb-8"></div>

            <div className="mb-8">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                IMPORTANT NOTES
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-gray-500">
                  <div className="w-1 h-1 rounded-full bg-[#2E8B57] mt-2 shrink-0"></div>
                  Credits are deducted when candidate starts the assessment.
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-500">
                  <div className="w-1 h-1 rounded-full bg-[#2E8B57] mt-2 shrink-0"></div>
                  Credits can be used for any candidate across all assessment types.
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-500">
                  <div className="w-1 h-1 rounded-full bg-[#2E8B57] mt-2 shrink-0"></div>
                  Pricing is subject to update based on feature releases.
                </li>
              </ul>
            </div>

            <button className="w-full bg-[#2E8B57] hover:bg-[#236F45] text-white font-bold py-4 rounded-lg transition-colors">
              Contact Sales for Enterprise Credits
            </button>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
