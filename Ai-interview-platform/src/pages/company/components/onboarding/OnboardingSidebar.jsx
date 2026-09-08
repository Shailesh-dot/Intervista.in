import React from "react";
import { FaCheckCircle } from "react-icons/fa";
import { IoMdInformationCircleOutline } from "react-icons/io";

const OnboardingSidebar = ({ steps, currentStep }) => {
  return (
    <div className="hidden lg:flex w-80 bg-white border-r border-brand-light flex-col p-10 overflow-y-auto custom-scrollbar">
      <div className="mb-12">
        <img src="/logo.jpg" alt="Logo" className="h-10 mb-2" />
        <h1 className="text-2xl font-black text-brand-dark tracking-tight leading-none">Register account</h1>
      </div>

      <div className="space-y-1 relative">
        {/* Vertical line connector */}
        <div className="absolute left-[1.125rem] top-8 bottom-8 w-[2px] bg-brand-light"></div>
        
        {steps.map((step) => (
          <div key={step.id} className="relative flex items-center gap-4 py-4 group">
            <div className={`
              relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
              ${currentStep === step.id ? 'bg-brand-dark text-white shadow-lg shadow-brand-dark/20' : 
                currentStep > step.id ? 'bg-green-500 text-white' : 'bg-brand-light text-brand-gray'}
            `}>
              {currentStep > step.id ? <FaCheckCircle size={14}/> : step.id}
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-bold transition-colors ${currentStep === step.id ? 'text-brand-dark' : 'text-brand-gray'}`}>
                {step.title}
              </span>
              {currentStep === step.id && (
                <span className="text-[10px] text-brand-dark/50 uppercase font-black tracking-widest mt-0.5">In progress</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        <div className="p-4 bg-brand-light/30 rounded-2xl flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-brand-dark/10 flex items-center justify-center text-brand-dark">
              <IoMdInformationCircleOutline size={18}/>
           </div>
           <p className="text-[10px] font-bold text-brand-dark/60 leading-tight">
              All details are required to complete your company profile setup.
           </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSidebar;
