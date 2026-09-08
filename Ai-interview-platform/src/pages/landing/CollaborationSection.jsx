import { motion } from "framer-motion";
import { Link } from "react-router-dom";
export default function CollaborationSection() {
  return (
    <section id="collaboration" className="py-24 bg-brand-dark text-white overflow-hidden relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.9 }}
        className="container mx-auto px-6 text-center relative z-10"
      >
        <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">
          Join Us for Industry Collaboration
        </h2>
        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-12 leading-relaxed">
          We collaborate with companies and universities to improve
          AI-driven hiring systems. Let's build the future of recruitment together.
        </p>
        <Link to="/company/login" className="px-10 py-5 text-lg font-bold text-brand-dark bg-brand-secondary rounded-2xl transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] inline-block">
          Collaborate With Us
        </Link>
      </motion.div>
      
      {/* Subtle decorative elements */}
      {/* <div className="absolute top-0 right-0 w-96 h-96 bg-brand-secondary/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-secondary/5 rounded-full blur-[100px] -ml-48 -mb-48"></div> */}
      <div className="absolute top-60  right-110 w-1/2 h-full bg-brand-secondary/5 blur-[120px] pointer-events-none"></div>
    </section>
  );
}