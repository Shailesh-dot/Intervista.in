import { motion } from "framer-motion";

export default function ProblemSection() {
  return (
    <section id="problem" className="py-26 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-15 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="md:w-1/2"
          >
            <span className="inline-block px-4 py-1.5 mb-4 text-xs font-bold tracking-[0.2em] uppercase text-brand-dark/60 bg-brand-dark/5 rounded-full">
              The Challenge
            </span>
            <h2 className="text-4xl md:text-5xl leading-tight font-black text-brand-dark mb-6 tracking-tight">
              Hiring the Right Candidate Is Hard
            </h2>
            <p className="text-xl text-brand-gray leading-relaxed mb-8">
              Recruiters often struggle with unreliable resumes,
              impersonation during online tests, and inconsistent evaluations.
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
            className="md:w-1/2 pt-14 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {[
              "Unreliable Resumes",
              "Identity Fraud",
              "Manual Evaluation Errors",
              "Poor Skill Measurement"
            ].map((item, i) => (
              <motion.div 
                key={i} 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="p-6 bg-brand-light rounded-2xl border border-brand-dark/5 flex items-center gap-4"
              >
                <div className="w-2 h-2 rounded-full bg-brand-secondary"></div>
                <span className="font-bold text-brand-dark">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}