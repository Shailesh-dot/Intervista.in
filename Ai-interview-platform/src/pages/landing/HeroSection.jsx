import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 md:pt-48 pb-28 md:pb-36 text-center relative overflow-hidden"
    >
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-5xl mx-auto font-black tracking-tight mb-8 leading-[1.1] text-brand-dark"
      >
        AI-Powered Interview Platform for
        <br />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-dark via-brand-dark/90 to-brand-dark/100 animate-gradient">
          Smart Candidate Evaluation
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="text-lg md:text-xl text-brand-gray max-w-3xl mx-auto mb-12 leading-relaxed"
      >
        Assess skills, verify identity, and conduct AI-driven technical
        interviews — all in one secure hiring platform.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <Link
          to="/login"
          state={{ fromLanding: true }}
          className="px-10 py-5 text-lg font-normal tracking-wider text-white bg-brand-dark rounded-xl transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-brand-dark/10"
        >
          Take the Test
        </Link>
        <Link
          to="/about"
          className="px-10 py-5 text-lg font-bold text-brand-dark bg-brand-secondary rounded-xl transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
        >
          Learn More
        </Link>
      </motion.div>
    </section>
  );
}