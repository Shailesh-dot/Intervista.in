import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Lenis from "lenis";
import {
  FiCheckCircle, FiChevronRight, FiMonitor, FiShield,
  FiDownload, FiRefreshCw, FiLayers, FiDatabase, FiVideo,
  FiCode, FiZap, FiUsers, FiBarChart2, FiMail
} from "react-icons/fi";
import { BsGrid3X3, BsBriefcase } from "react-icons/bs";
import { GiArtificialIntelligence } from "react-icons/gi";
import Navbar from "../../components/layout/Navbar";
import FooterSection from "../landing/FooterSection";

/* ── Reusable animated components ── */
const Tag = ({ label }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-[#2d9e8e] bg-[#e8f7f5] rounded-full border border-[#c2e8e3] mb-5">
    {label}
  </span>
);

const Bullet = ({ text }) => (
  <li className="flex items-start gap-2.5 text-[14px] text-gray-500 leading-relaxed">
    <FiCheckCircle className="w-4 h-4 text-[#2d9e8e] shrink-0 mt-0.5" />
    {text}
  </li>
);

const LearnMore = ({ to = "/how-it-works" }) => (
  <Link to={to}
    className="inline-flex items-center gap-2 px-6 py-3 bg-[#e53e2f] hover:bg-[#c93527] text-white font-semibold text-sm rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg mt-6 group">
    Learn more
    <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
  </Link>
);

const FadeSection = ({ children, delay = 0, direction = "up" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
      x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
    },
    visible: { opacity: 1, y: 0, x: 0, transition: { duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] } },
  };
  return (
    <motion.div ref={ref} variants={variants} initial="hidden" animate={inView ? "visible" : "hidden"}>
      {children}
    </motion.div>
  );
};

/* ── Word-by-word text reveal ── */
const RevealText = ({ text, className, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const words = text.split(" ");
  return (
    <h1 ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span key={i} className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{ duration: 0.5, delay: delay + i * 0.06, ease: [0.22, 1, 0.36, 1] }}>
          {word}
        </motion.span>
      ))}
    </h1>
  );
};

/* ── Section divider ── */
const Divider = () => <div className="w-full my-24"><div className="w-full max-w-6xl mx-auto h-px bg-gray-200" /></div>;

/* ── Dot grid decoration ── */
const DotGrid = () => (
  <div className="flex gap-1.5 flex-wrap w-12">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="w-1 h-1 rounded-full bg-gray-300" />
    ))}
  </div>
);

/* ── Mock UI Cards ── */
const CandidateCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.97 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-gray-100 p-6 max-w-md ml-auto"
  >
    <div className="flex items-center justify-between mb-4">
      <DotGrid />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CANDIDATE ACTIVE</span>
    </div>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop&auto=format" alt="Alex Chen" className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100" />
      <div>
        <p className="text-sm font-bold text-gray-900">Alex Chen</p>
        <p className="text-xs text-gray-500">Senior AI Engineer</p>
      </div>
    </div>
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-[10px] font-bold text-[#2d9e8e] uppercase tracking-wider mb-2">AI PROMPT GENERATED</p>
      <p className="text-xs text-gray-700 italic leading-relaxed">"Based on your experience at TechCorp with Kubernetes, can you describe a time you managed a multi-region cluster failure?"</p>
      <div className="flex gap-2 mt-3">
        <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[10px] text-gray-600 font-medium">Technical Depth</span>
        <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[10px] text-gray-600 font-medium">Adaptability</span>
      </div>
    </div>
  </motion.div>
);

const ProctorCard = () => (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    className="relative rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.12)] max-w-md"
  >
    <img
      src="/live-image.png"
      alt="Live Monitoring"
      className="w-full h-[300px] object-cover"
    />
    <div className="absolute top-4 right-4">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e53e2f] text-white text-[11px] font-bold rounded-full shadow-lg">
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Live Monitoring
      </span>
    </div>
    <div className="absolute bottom-4 left-4 right-4 flex justify-between">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-[11px] rounded-full">
        <FiMonitor className="w-3 h-3" /> Eye-Tracking Active
      </span>
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-[11px] rounded-full">
        <FiShield className="w-3 h-3" /> Verified Environment
      </span>
    </div>
  </motion.div>
);

const AssessmentGrid = () => {
  const modules = [
    { icon: BsBriefcase, label: "Aptitude", color: "#f0fdf4", iconColor: "#22c55e" },
    { icon: FiCode, label: "Coding", color: "#f0f4ff", iconColor: "#6366f1" },
    { icon: FiUsers, label: "Communication", color: "#f0fdf4", iconColor: "#22c55e" },
    { icon: FiZap, label: "AI HR", color: "#fdf4ff", iconColor: "#a855f7" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-2 gap-4 max-w-xs ml-auto"
    >
      {modules.map((m, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: m.color }}>
            <m.icon className="w-6 h-6" style={{ color: m.iconColor }} />
          </div>
          <span className="text-sm font-semibold text-gray-800">{m.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
};

const AnalyticsCard = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-gray-100 p-6 max-w-md"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PIPELINE INSIGHTS</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">Candidate Progress</p>
        </div>
        <div className="flex items-center gap-1">
          <FiBarChart2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-800">84%</span>
        </div>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: "84%" } : {}}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-[#2d9e8e] rounded-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">AVERAGE SCORE</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold text-[#2d9e8e] mt-1">78.5</motion.p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">HIRED</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6 }}
            className="text-2xl font-bold text-gray-800 mt-1">12</motion.p>
        </div>
      </div>
      <button className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
        <FiDownload className="w-4 h-4" /> Export Excel Report
      </button>
    </motion.div>
  );
};

const WorkflowCard = () => {
  const steps = [
    { icon: FiMail, label: "Invitation Sent", sub: "Sent to 42 candidates automatically", color: "#e8f7f5", iconColor: "#2d9e8e" },
    { icon: BsBriefcase, label: "Evaluated", sub: "Results generated for Batch A", color: "#e8f7f5", iconColor: "#2d9e8e" },
    { icon: FiRefreshCw, label: "Processing Next", sub: "Resume ranking in progress...", color: "#fafafa", iconColor: "#9ca3af" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3 max-w-sm ml-auto"
    >
      {steps.map((s, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15, duration: 0.5 }}
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: s.color }}>
            <s.icon className="w-5 h-5" style={{ color: s.iconColor }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

const CapabilityCard = () => {
  const items = ["Bulk Candidate Handler", "Auto-Question Gen", "Real-time Stream"];
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-gray-100 p-6 h-80 max-w-md"
    >
      <div className="flex items-center gap-2 mb-5 pb-5">
        <FiLayers className="w-5 h-5 text-gray-500" />
        <span className="font-semibold text-gray-800 text-sm">Capability Suite</span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2d9e8e]" />
              <span className="text-sm text-gray-700 font-medium">{item}</span>
            </div>
            <button className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#2d9e8e] hover:text-[#2d9e8e] transition-colors text-lg leading-none">+</button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

/* ── Feature Section Layout ── */
const FeatureSection = ({ tag, title, bold, description, bullets, uiRight, uiLeft, delay = 0 }) => (
  <section className="max-w-5xl mx-auto px-6 py-20">
    <div className={`flex flex-col ${uiRight ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-16`}>
      <div className="lg:w-1/2">
        <FadeSection delay={delay} direction={uiRight ? "right" : "left"}>
          <Tag label={tag} />
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">{title}</h2>
          {bold && <p className="font-bold text-gray-800 text-[15px] mb-3">{bold}</p>}
          {description && <p className="text-gray-500 text-sm leading-relaxed mb-5">{description}</p>}
          <ul className="space-y-2.5 mb-2">
            {bullets.map((b, i) => <Bullet key={i} text={b} />)}
          </ul>
          <LearnMore />
        </FadeSection>
      </div>
      <div className="lg:w-1/2">
        {uiRight || uiLeft}
      </div>
    </div>
  </section>
);

/* ── Main Page ── */
export default function FeaturesPage() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    window.scrollTo(0, 0);
    return () => lenis.destroy();
  }, []);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-gray-900 overflow-x-hidden">
      <Navbar theme="light" />

      {/* ── Hero ── */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative pt-52 pb-20 px-6 text-center w-full min-h-[500px] flex flex-col justify-center items-center overflow-hidden"
      >
        {/* Background Image & Overlays */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=2000&q=80"
            alt="Features Hero"
            className="w-full h-full object-cover object-center"
          />
          {/* Overlay to ensure text readability and maintain brand feel */}
          <div className="absolute inset-0 bg-[#1e2235]/60"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <RevealText
            text="Features – Intervista by Knitnet"
            className="text-5xl md:text-6xl font-black leading-tight text-white mb-6 drop-shadow-xl"
            delay={0}
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="text-white/90 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto drop-shadow-lg font-medium"
          >
            The comprehensive ecosystem for modern HR professionals to automate, proctor, and evaluate at scale. Empowering teams with data-driven recruitment through advanced artificial intelligence.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 flex justify-center w-full mt-10 opacity-40 invert"
        >
          <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Section 1: AI Interviews ── */}
      <FeatureSection
        tag="AI-Assisted Interviews"
        title="Intuitive Candidate Interaction"
        bold="Enable high-context conversations that go beyond standard questionnaire templates."
        description="Our proprietary LLM engine analyzes candidate resumes in real-time to generate custom probing questions, ensuring every interview feels personal and technically rigorous."
        bullets={[
          "Adaptive interview flows based on dynamic candidate responses.",
          "Faster screening cycles by identifying top talent through contextual verification.",
          "Enhanced candidate experience with human-like AI conversational agents.",
        ]}
        uiRight={<CandidateCard />}
        delay={0}
      />

      <Divider />

      {/* ── Section 2: Proctoring ── */}
      <FeatureSection
        tag="Proctoring System"
        title="Maintain Assessment Integrity"
        bold="Secure your hiring pipeline against fraud with enterprise-grade monitoring tools."
        description="The integrated monitoring system utilizes multi-factor verification, including biometric analysis and eye-tracking, to ensure fair assessments without intrusive over-surveillance."
        bullets={[
          "Real-time visual monitoring with AI-driven anomaly detection flags.",
          "Higher validity in remote testing through verified environment protocols.",
          "Automated flagging of screen-sharing or external browser usage.",
        ]}
        uiLeft={<ProctorCard />}
        delay={0.1}
      />

      <Divider />

      {/* ── Section 3: Multi-Assessment ── */}
      <FeatureSection
        tag="Multi-Assessment Engine"
        title="Holistic Candidate Evaluation"
        bold="Measure every dimension of a candidate's potential with a unified scoring framework."
        description="Deploy specialized tests covering technical coding, verbal communication, and cognitive aptitude simultaneously. All data is synthesized into a single, easy-to-read talent profile."
        bullets={[
          "Standardized cross-departmental scoring for fairer hiring comparisons.",
          "Versatile test modules including coding, aptitude, and verbal communication.",
          "Direct integration with global skill benchmarks and industry standards.",
        ]}
        uiRight={<AssessmentGrid />}
        delay={0.1}
      />

      <Divider />

      {/* ── Section 4: Analytics ── */}
      <FeatureSection
        tag="Reporting & Analytics"
        title="Data-Driven Hiring Decisions"
        bold="Turn raw interview data into actionable intelligence for leadership teams."
        description="Move away from gut-feeling hires. Our analytics suite provides deep insights into candidate performance trends, pipeline health, and recruitment ROI with granular detail."
        bullets={[
          "Comprehensive dashboard insights for high-level recruitment monitoring.",
          "Exportable metrics in Excel and PDF formats for board-level reporting.",
          "Predictive success modeling based on historical performance data.",
        ]}
        uiLeft={<AnalyticsCard />}
        delay={0.1}
      />

      <Divider />

      {/* ── Section 5: Automation ── */}
      <FeatureSection
        tag="Automation"
        title="Streamlined Recruitment Workflow"
        bold="Eliminate repetitive administrative tasks and focus on building high-impact teams."
        description="Automate the entire lifecycle of a candidate—from initial invitation to final report generation. Our workflow engine handles the logistics while you make the final decisions."
        bullets={[
          "Candidate invitation system with automated follow-up scheduling.",
          "Automated report generation immediately following assessment completion.",
          "Batch processing of resumes with AI-driven ranking and filtering.",
        ]}
        uiRight={<WorkflowCard />}
        delay={0.1}
      />

      <Divider />

      {/* ── Section 6: Capabilities ── */}
      <FeatureSection
        tag="Additional Capabilities"
        title="Tailored for Every Requirement"
        bold="A modular toolkit designed to adapt to the unique needs of scaling enterprises."
        description="Whether you need bulk candidate handling for high-volume roles or structured evaluation for senior executives, Intervista scales to meet your exact organizational demands."
        bullets={[
          "Bulk candidate handling for rapid high-volume recruitment drives.",
          "Structured evaluation frameworks specifically for graduate/fresher hiring.",
          "Real-time streaming of interviews for collaborative panel reviews.",
        ]}
        uiLeft={<CapabilityCard />}
        delay={0.1}
      />

      {/* ── CTA ── */}
      <section className="px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto bg-[#1a1f2e] rounded-3xl px-10 py-20 text-center"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight"
          >
            Ready to transform your hiring?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-gray-400 text-lg mb-10 max-w-xl mx-auto"
          >
            Join 500+ forward-thinking HR teams using Intervista to build the future of their workforce.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/login" className="px-8 py-3.5 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all duration-300 hover:scale-105 active:scale-95">
              Get Started Free
            </Link>
            <Link to="/contact" className="px-8 py-3.5 border border-white/20 text-white font-bold rounded-xl hover:bg-white/10 transition-all duration-300">
              Contact Sales
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <FooterSection />
    </div>
  );
}
