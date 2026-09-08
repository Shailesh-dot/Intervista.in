import React from "react";
import { FiUser } from "react-icons/fi";

export default function CompanyTopBar({ companyName, companyLogo }) {
  return (
    <div className="topbar-anim h-20 bg-white shadow-sm border-b border-gray-100 flex flex-shrink-0 items-center justify-between px-12 pl-3 relative z-10 w-full">
      
      {/* Left side: Platform Logo */}
      <div className="flex items-center">
        <img 
          src="/intervista full logo 4.svg" 
          alt="Intervista" 
          className="h-14 object-contain" 
        />
      </div>

      {/* Right side: Points and Company Profile */}
      <div className="flex items-center gap-8">
        
        {/* Points Badge */}
        <div className="flex items-center bg-[#FEF4C1] rounded-full pl-1 pr-4 py-1 gap-2 shadow-sm border border-[#FBE58C]">
          <div className="w-8 h-8 flex items-center justify-center rounded-full">
            <img 
              src="/Point.svg" 
              alt="Points" 
              className="w-full h-full object-contain" 
            />
          </div>
          <span className="font-bold text-[#F5A623]">10000</span>
        </div>

        {/* Company Profile Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden shadow-sm">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
            ) : (
              <FiUser size={20} />
            )}
          </div>
          <span className="font-bold text-gray-900 tracking-tight text-base">
            {companyName || "Company Name"}
          </span>
        </div>

      </div>
      
    </div>
  );
}
