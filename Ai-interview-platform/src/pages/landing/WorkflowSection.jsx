import { motion } from "framer-motion";

const steps = [
  "Identity Verification",
  "Resume Analysis",
  "Candidate Introduction",
  "Skill Assessment",
  "AI Interview",
  "Coding Test",
  "Response Analysis",
  "Performance Report",
];

export default function WorkflowSection() {
  return (
    <section id="workflow" className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-bold tracking-[0.2em] uppercase text-brand-dark/60 bg-brand-dark/5 rounded-full">
            The Process
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-brand-dark tracking-tight">
            How the Platform Works
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative group"
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-brand-light border border-brand-dark/5 rounded-2xl flex items-center justify-center text-brand-dark font-black transition-all duration-300 group-hover:bg-brand-secondary group-hover:scale-110">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-dark mt-2">{step}</h3>
                  <div className="mt-2 w-12 h-1 bg-brand-secondary/30 rounded-full group-hover:w-24 transition-all duration-500"></div>
                </div>
              </div>
              {/* Connector line for large screens */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[3rem] w-full h-[1px] bg-brand-dark/5 -z-10"></div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}