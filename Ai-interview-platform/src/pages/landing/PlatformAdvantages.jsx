import { motion } from "framer-motion";

export default function PlatformAdvantages() {
  const advantages = [
    "AI-driven interviews",
    "Project-based evaluation",
    "Secure identity verification",
    "Scalable assessments",
    "Data-driven insights"
  ];

  return (
    <section className="py-32 bg-brand-dark text-white overflow-hidden relative">
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/2"
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] uppercase text-brand-secondary/80 bg-brand-secondary/10 rounded-full text-brand-secondary">
              Why KnitNet
            </span>
            <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">
              Why Companies <br />Choose Us
            </h2>
            <p className="text-xl text-white/60 leading-relaxed">
              We provide a robust, AI-powered framework that eliminates bias, 
              ensures integrity, and scales with your hiring needs.
            </p>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="lg:w-1/2 grid grid-cols-1 gap-4 w-full"
          >
            {advantages.map((item, i) => (
              <motion.div 
                key={i} 
                variants={{
                  hidden: { opacity: 0, x: 30 },
                  visible: { opacity: 1, x: 0 }
                }}
                className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all duration-300"
              >
                <span className="text-lg font-bold text-white/90">{item}</span>
                <div className="w-10 h-10 rounded-full bg-brand-secondary flex items-center justify-center text-brand-dark font-black opacity-0 group-hover:opacity-100 transition-opacity">
                  ✓
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-0 w-1/2 h-full bg-brand-secondary/5 blur-[120px] pointer-events-none"></div>
    </section>
  );
}