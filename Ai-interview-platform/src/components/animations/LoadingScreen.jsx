import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial app load
    // In a real app, this could be tied to assets loading or initial API calls
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: "easeInOut" }
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
        >
          {/* Logo Animation */}
          <div className="relative mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1, 0.9],
                opacity: [0, 1, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-24 h-24 bg-brand-dark rounded-[50%] flex items-center justify-center overflow-hidden shadow-2xl shadow-brand-dark/20"
            >
              <img src="/logo.jpg" alt="Knitnet Logo" className="w-full h-full object-cover" />
            </motion.div>
            
            {/* Ripple Effect */}
            <motion.div
              animate={{ 
                scale: [1, 1.5],
                opacity: [0.3, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
              className="absolute inset-0 bg-brand-dark rounded-[50%] -z-10"
            />
          </div>

          {/* Text Animation */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <h2 className="text-xl font-black tracking-widest text-brand-dark mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-dark to-brand-dark/80">KNIT</span>NET
            </h2>
            <div className="flex items-center gap-1 justify-center">
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                className="w-1.5 h-1.5 bg-brand-dark rounded-full"
              />
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                className="w-1.5 h-1.5 bg-brand-dark rounded-full"
              />
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                className="w-1.5 h-1.5 bg-brand-dark rounded-full"
              />
            </div>
          </motion.div>

          {/* Progress Bar */}
          {/* <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="h-full bg-brand-dark"
            />
          </div> */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
