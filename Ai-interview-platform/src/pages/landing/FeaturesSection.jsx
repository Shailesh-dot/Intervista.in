import { motion } from "framer-motion";

const features = [
  {
    title: "Identity Verification",
    desc: "OTP login and photo verification",
  },
  {
    title: "Resume Based Interviews",
    desc: "AI analyzes resumes to generate questions",
  },
  {
    title: "AI Technical Interview",
    desc: "Adaptive interview questions",
  },
  {
    title: "Skill Assessment",
    desc: "Behavioral and aptitude evaluation",
  },
  {
    title: "Coding Evaluation",
    desc: "Test programming skills",
  },
  {
    title: "Automated Reports",
    desc: "Generate candidate insights",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-32 pt-20 bg-brand-light">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-bold tracking-[0.2em] uppercase text-brand-dark/60 bg-brand-dark/5 rounded-full">
            Features
          </span>
          <h2 className="text-4xl  md:text-5xl font-black text-brand-dark tracking-tight">
            Platform Features
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              key={index} 
              className="p-8 bg-white border border-brand-dark/5 rounded-3xl transition-all duration-300 hover:shadow-2xl hover:shadow-brand-dark/5 hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 mb-6 bg-brand-secondary rounded-2xl flex items-center justify-center text-brand-dark font-black text-xl group-hover:scale-110 transition-transform">
                {index + 1}
              </div>
              <h3 className="text-xl font-bold text-brand-dark mb-3">
                {f.title}
              </h3>
              <p className="text-brand-gray leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}