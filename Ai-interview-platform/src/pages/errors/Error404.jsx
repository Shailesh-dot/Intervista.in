import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { IoArrowForward } from "react-icons/io5";
import illustration from "../../assets/images/404_robot.png";

export default function Error404() {
  return (
    <div className="min-h-screen w-full bg-[#EAF0F0] flex items-center justify-center p-6 md:p-12 font-sans overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-20 w-96 h-96 bg-[#144542]/5 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 -right-20 w-[30rem] h-[30rem] bg-[#DAFF0C]/5 rounded-full blur-3xl" 
        />
      </div>

      <div className="max-w-7xl w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20 relative z-10">
        
        {/* Left Side - Text Content */}
        <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-[8rem] md:text-[12rem] font-black text-[#144542] leading-none tracking-tighter drop-shadow-sm mb-2">
              404
            </h1>
            <div className="w-20 h-2 bg-[#DAFF0C] mb-8 mx-auto lg:ml-0 rounded-full"></div>
            
            <h2 className="text-3xl md:text-4xl font-black text-[#144542] mb-6 leading-tight">
              Oops! This page <br className="hidden md:block" /> 
              seems to be missing.
            </h2>
            
            <p className="text-gray-500 text-lg md:text-xl font-medium mb-10 max-w-lg leading-relaxed">
              Our AI detective robot couldn't find the page you're looking for. It might have been moved or doesn't exist anymore.
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to="/" 
                className="inline-flex items-center gap-3 px-10 py-5 bg-[#144542] text-[#DAFF0C] font-black rounded-2xl shadow-xl shadow-[#144542]/20 hover:shadow-2xl hover:shadow-[#144542]/30 transition-all group"
              >
                <span className="text-lg tracking-wide uppercase">Back to Home</span>
                <IoArrowForward className="text-2xl group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side - Animated Illustration */}
        <div className="flex-1 flex justify-center items-center order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              rotate: 0,
              y: [0, -20, 0] 
            }}
            transition={{ 
              opacity: { duration: 1 },
              scale: { duration: 1 },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="relative"
          >
            {/* Soft Glow behind robot */}
            <div className="absolute inset-0 bg-[#144542]/10 rounded-full blur-3xl scale-75"></div>
            
            <img 
              src={illustration} 
              alt="404 AI Detective" 
              className="w-full max-w-[500px] h-auto drop-shadow-[0_25px_50px_rgba(20,69,66,0.15)] relative z-10"
            />
            
            {/* Small Floating Blobs around image */}
            <motion.div 
              animate={{ y: [0, 15, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-10 -right-4 w-12 h-12 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center text-2xl"
            >
              ❓
            </motion.div>
            <motion.div 
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute bottom-20 -left-10 w-16 h-16 bg-[#DAFF0C] rounded-full shadow-lg flex items-center justify-center text-3xl"
            >
              🔍
            </motion.div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
