import { motion } from "framer-motion";

export default function SolutionSection() {
  return (
    <section id="solution" className="py-16 md:py-20 bg-brand-dark text-white text-center rounded-3xl md:rounded-[4rem] mx-4 sm:mx-6 md:mx-auto max-w-7xl my-10 mt-20 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto px-6"
      >
        <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] uppercase text-brand-secondary/80 bg-brand-secondary/10 rounded-full">
          Our Solution
        </span>
        <h2 className="text-4xl md:text-6xl font-black leading-tight mb-8 tracking-tight">
          A Smarter Way to Evaluate Candidates
        </h2>
        <p className="text-xl text-white/70 leading-relaxed mb-12">
          Our AI-powered platform simulates a real hiring process
          by analyzing candidate resumes and conducting
          structured AI interviews. We bridge the gap between screening and selection.
        </p>
        <div className="inline-flex items-center gap-4 text-brand-secondary font-bold text-lg">
          <span className="w-12 h-[1px] bg-brand-secondary/30"></span>
          AI-Driven Precision
          <span className="w-12 h-[1px] bg-brand-secondary/30"></span>
        </div>
      </motion.div>
    </section>
  );
}