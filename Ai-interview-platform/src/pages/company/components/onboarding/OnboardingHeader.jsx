import React from "react";

const OnboardingHeader = ({ steps, currentStep }) => {
  return (
    <div className="lg:hidden mb-8 text-center">
      <h1 className="text-3xl font-black text-brand-dark mb-2">Company Setup</h1>
      <div className="flex justify-center gap-2">
        {steps.map(s => (
          <div 
            key={s.id} 
            className={`h-1.5 w-8 rounded-full ${currentStep >= s.id ? 'bg-brand-dark' : 'bg-brand-light'}`}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default OnboardingHeader;
