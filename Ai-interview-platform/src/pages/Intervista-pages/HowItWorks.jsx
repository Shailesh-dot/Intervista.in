import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import FooterSection from "../landing/FooterSection";
import { FiUser, FiBriefcase, FiArrowRight, FiCheckCircle } from "react-icons/fi";

/* ─── Step Component ─────────────────────────────────────────── */
const Step = ({ number, title, isLast = false, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -15 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="flex items-start gap-4 relative group"
  >
    {/* Number circle + connector */}
    <div className="flex flex-col items-center shrink-0">
      <div className="w-9 h-9 rounded-full border-2 border-[#c9973a] text-[#c9973a] flex items-center justify-center text-sm font-bold z-10 bg-[#1e2235] group-hover:bg-[#c9973a] group-hover:text-[#1a1d2e] transition-all duration-300">
        {number}
      </div>
      {!isLast && (
        <div className="w-px flex-1 bg-[#c9973a]/25 mt-1" style={{ minHeight: "40px" }} />
      )}
    </div>

    {/* Title */}
    <div className={`${isLast ? "pb-0" : "pb-10"} pt-1.5`}>
      <p className="text-[15px] font-medium text-gray-200 leading-snug group-hover:text-white transition-colors">
        {title}
      </p>
    </div>
  </motion.div>
);

/* ─── Page ────────────────────────────────────────────────────── */
export default function HowItWorks() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="bg-[#12151f] min-h-screen flex flex-col font-sans text-white overflow-x-hidden">
      <Navbar theme="light" />

      <main className="flex-grow">

        {/* ── Hero ── */}
        <section className="pt-36 pb-16 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center"
          >
            <span className="inline-block px-5 py-1.5 rounded-full border border-[#c9973a]/40 text-[#c9973a] text-[11px] font-bold uppercase tracking-[0.2em] mb-8 bg-[#c9973a]/5">
              Platform Overview
            </span>

            <h1 className="text-5xl md:text-[68px] font-extrabold tracking-tight leading-tight mb-6">
              How{" "}
              <span className="italic text-[#c9973a] font-bold">Intervista</span>{" "}
              Works
            </h1>

            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Experience the next generation of AI-powered interview assessments. Designed for elite
              individual growth and high-scale organizational hiring.
            </p>
          </motion.div>
        </section>

        {/* ── Two-Column Workflow Cards ── */}
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Individual Users Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative group rounded-2xl"
            >
              {/* Border Glow Effect */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#c9973a]/0 via-[#c9973a] to-[#c9973a]/0 rounded-2xl blur-md opacity-0 group-hover:opacity-60 transition duration-700"></div>
              
              <div className="relative bg-[#1e2235] border border-white/8 group-hover:border-[#c9973a]/40 transition-colors duration-500 rounded-2xl p-8 md:p-10 h-full">
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#c9973a]/15 flex items-center justify-center text-[#c9973a]">
                  <FiUser className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-white">For Individual Users</h2>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                Elevate your career with simulated high-stakes interviews. Get real-time feedback and
                detailed analytics to master your communication and technical skills.
              </p>

              {/* Steps */}
              <div>
                <Step number={1} title="Select an interview plan" delay={0.1} />
                <Step number={2} title="Complete payment" delay={0.15} />
                <Step number={3} title="Start the interview" delay={0.2} />
                <Step number={4} title="Complete assessments" delay={0.25} />
                <Step number={5} title="Receive performance report and analytics" isLast delay={0.3} />
              </div>
              </div>
            </motion.div>

            {/* Organizations Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="relative group rounded-2xl"
            >
              {/* Border Glow Effect */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#c9973a]/0 via-[#c9973a] to-[#c9973a]/0 rounded-2xl blur-md opacity-0 group-hover:opacity-60 transition duration-700"></div>

              <div className="relative bg-[#1e2235] border border-white/8 group-hover:border-[#c9973a]/40 transition-colors duration-500 rounded-2xl p-8 md:p-10 h-full">
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#c9973a]/15 flex items-center justify-center text-[#c9973a]">
                  <FiBriefcase className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-white">For Organizations (HRs)</h2>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                Streamline your hiring process with our enterprise-grade assessment platform. Configure
                multi-module interviews and manage candidate pipelines with ease.
              </p>

              {/* Steps */}
              <div>
                <Step number={1} title="Purchase credits" delay={0.1} />
                <Step number={2} title="Configure interview by selecting modules" delay={0.15} />
                <Step number={3} title="Add candidate details and send invitations" delay={0.2} />
                <Step number={4} title="Candidates attend the interview" delay={0.25} />
                <Step number={5} title="Credits are deducted upon interview start" delay={0.3} />
                <Step number={6} title="Access reports, analytics, and leaderboard" isLast delay={0.35} />
              </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="px-6 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-6xl mx-auto bg-[#1e2235] border border-white/8 rounded-2xl px-10 py-12 flex flex-col items-center text-center gap-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Ready to transform your hiring workflow?
            </h2>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="px-8 py-3.5 bg-[#c9973a] hover:bg-[#b8852e] text-[#12151f] font-bold rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-[#c9973a]/20"
              >
                Start Free Trial
              </Link>
              <Link
                to="/contact"
                className="px-8 py-3.5 bg-transparent border border-white/20 text-white font-bold rounded-xl hover:border-white/40 hover:bg-white/5 transition-all duration-300"
              >
                Book a Demo
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ── Trust + Testimonial ── */}
        <section className="px-6 pb-32">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Left: Trust copy */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-8">
                Trusted by world-class teams<br />
                to find{" "}
                <span className="text-[#c9973a]">exceptional talent.</span>
              </h2>

              <ul className="space-y-4">
                {[
                  "AI-driven bias reduction for equitable hiring.",
                  "Scalable architecture supporting 10,000+ candidates.",
                  "Proprietary skill-matching algorithms.",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
                    className="flex items-start gap-3 text-gray-300 text-[15px]"
                  >
                    <FiCheckCircle className="w-5 h-5 text-[#c9973a] shrink-0 mt-0.5" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Right: Testimonial */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="bg-[#1e2235] border border-white/8 rounded-2xl p-8 md:p-10"
            >
              {/* Quote mark */}
              <div className="text-[#c9973a] text-5xl font-serif leading-none mb-4">"</div>

              <p className="text-gray-200 text-[15px] leading-relaxed italic mb-8">
                "Intervista has completely revolutionized our technical interview process. We've seen a
                40% reduction in time-to-hire while significantly increasing the quality of our
                engineering talent."
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80"
                  alt="Sarah John"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-bold text-white">Sarah John</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                    Senior AI Engineer, Nextgen
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </main>

      <FooterSection />
    </div>
  );
}
