import { motion } from "framer-motion";
import { Link } from "react-router-dom";
export default function FooterSection() {
  return (
    <footer className="bg-black text-white py-16 border-t border-white/10">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.8 }}
        className="max-w-6xl mx-auto px-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold mb-0 -mt-0 flex items-center gap-0">
              <div className="w-42 h-16  flex items-center justify-center overflow-hidden">
                <img src="/intervista full logo 1.svg" alt="intervista Logo" className="w-full h-full object-cover" />
              </div>
            
            </h3>
            <p className="text-brand-gray text-sm leading-relaxed">
              AI-powered interview platform for smart candidate evaluation.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300">Features</Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300">How It Works</Link>
              </li>
              <li>
                <Link to="/pricing" className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300">Pricing</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300">About</Link>
              </li>
              <li>
                <Link to="/about" className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300">Careers</Link>
              </li>
              <li>
                <Link to="/contact" className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300 text-brand-secondary">Contact</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-conditions"
                  className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-brand-gray text-sm">
            © 2026 AI Interview Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {["Twitter", "LinkedIn", "GitHub"].map((social, i) => (
              <a
                key={i}
                href="#"
                className="text-brand-gray text-sm hover:text-brand-secondary transition-colors duration-300"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </footer>
  );
}