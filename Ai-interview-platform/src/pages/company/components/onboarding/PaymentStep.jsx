import React from "react";
import { motion } from "framer-motion";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { FiZap, FiCreditCard } from "react-icons/fi";

const PaymentStep = ({ formData, isAgreed, onAgreeChange }) => {
  const [creditsToBuy, setCreditsToBuy] = React.useState("500");
  const totalAmount = (parseInt(creditsToBuy) || 0) * 1;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="bg-brand-dark/5 p-6 rounded-2xl border border-brand-dark/10">
        <h3 className="font-bold text-brand-dark mb-4 flex items-center gap-2">
          <IoMdInformationCircleOutline size={20}/>
          Review your application (Payment)
        </h3>
        <div className="space-y-4 text-sm text-brand-dark/70">
          <div className="flex justify-between border-b border-brand-dark/5 pb-2">
            <span className="font-medium">Company URL</span>
            <span className="font-bold">{formData.website || "Not set"}</span>
          </div>
          <div className="flex justify-between border-b border-brand-dark/5 pb-2">
            <span className="font-medium">Industry</span>
            <span className="font-bold">{formData.industry || "Not set"}</span>
          </div>
          <div className="flex justify-between border-b border-brand-dark/5 pb-2">
            <span className="font-medium">Size</span>
            <span className="font-bold">{formData.companySize || "Not set"}</span>
          </div>
          <div className="flex justify-between border-b border-brand-dark/5 pb-2">
            <span className="font-medium">GSTIN</span>
            <span className="font-bold">{formData.gstin || (formData.isGstRegistered ? "Not set" : "Not Registered")}</span>
          </div>
          <div className="flex justify-between border-b border-brand-dark/5 pb-2">
            <span className="font-medium">Billing Email</span>
            <span className="font-bold">{formData.billingEmail || "Not set"}</span>
          </div>
          <div className="flex justify-between border-b border-brand-dark/5 pb-2">
            <span className="font-medium">Billing Location</span>
            <span className="font-bold">{formData.city ? `${formData.city}, ${formData.state}` : "Not set"}</span>
          </div>
        </div>
      </div>

      {/* Credit-Based Model Section (Image 2 Redesign) */}
      <div className="bg-[#f8fcfb] rounded-[32px] p-8 md:p-12 border border-gray-100 flex flex-col lg:flex-row gap-12 mt-8">
        {/* Left Column: Model Info */}
        <div className="flex-1 space-y-8">
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 bg-[#f0f9f4] text-[#144542] text-[10px] font-bold tracking-widest rounded-full uppercase">
              For Organizations (HRs)
            </span>
            <h2 className="text-4xl font-black text-[#144542] leading-tight">
              Credit-Based <br /> Model
            </h2>
            <p className="text-[#144542]/70 text-sm font-medium leading-relaxed max-w-md">
              A flexible, scalable way to manage high-volume hiring. Buy credits once and use them across any candidate assessment type.
            </p>
          </div>

          <div className="space-y-4">
            {/* Price Box */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-5 shadow-sm max-w-sm">
              <div className="w-12 h-12 bg-[#f0f9f4] rounded-xl flex items-center justify-center text-[#22c55e]">
                <FiZap size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-[#144542]">1 Credit = ₹1</div>
                <div className="text-[10px] font-bold text-[#144542]/40 tracking-wider uppercase">Fixed Exchange Rate</div>
              </div>
            </div>

            {/* Example Calculation Box */}
            <div className="bg-[#f0f9f4] border border-[#e2f2ea] rounded-2xl p-5 max-w-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <IoMdInformationCircleOutline size={16} className="text-[#144542]/60" />
                <span className="text-[10px] font-bold text-[#144542]/60 tracking-wider uppercase">Example Calculation</span>
              </div>
              <p className="text-sm font-medium text-[#144542]/80">
                Aptitude + Coding + AI HR = <span className="font-bold text-[#144542]">289 Credits</span> per candidate.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Consumption Table */}
        <div className="flex-1 bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8 text-[#144542]">
            <FiCreditCard size={22} />
            <h3 className="font-bold text-lg">Credit Consumption per Candidate</h3>
          </div>

          <div className="space-y-6">
            {[
              { label: "Aptitude Assessment", cost: 79 },
              { label: "Coding Assessment", cost: 120 },
              { label: "Verbal Assessment", cost: 70 },
              { label: "AI HR Interview", cost: 99 },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#144542]/20 group-hover:bg-[#144542]/40 transition-colors" />
                  <span className="text-sm font-medium text-[#144542]/70">{item.label}</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-base font-black text-[#144542]">{item.cost}</span>
                  <span className="text-[11px] font-bold text-[#144542]/40 pb-0.5">Credits</span>
                </div>
              </div>
            ))}
          </div>

          {/* Important Notes Added Below List */}
          <div className="mt-8 pt-8 border-t border-gray-50 space-y-3">
            <h4 className="text-[11px] font-bold text-[#144542]/40 tracking-widest uppercase">Important Notes</h4>
            <ul className="space-y-2.5">
              {[
                "Credits are deducted when candidate starts the assessment.",
                "Credits can be used for any candidate across all assessment types.",
                "Pricing is subject to update based on feature releases."
              ].map((note, i) => (
                <li key={i} className="flex gap-2.5 text-[12px] font-medium text-[#144542]/60 leading-relaxed">
                  <div className="w-1 h-1 rounded-full bg-[#144542]/30 mt-1.5 flex-shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Purchase Credits Section (Separate Block) */}
      <div className="bg-white rounded-[32px] p-8 md:p-10 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row items-center gap-10 mt-4">
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-[#22c55e] rounded-full" />
            <h4 className="text-[11px] font-bold text-[#144542]/40 tracking-widest uppercase">Select Credits to Purchase</h4>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="relative w-full sm:w-64">
              <input 
                type="number"
                value={creditsToBuy}
                onChange={(e) => setCreditsToBuy(e.target.value)}
                onBlur={() => { if (creditsToBuy === "") setCreditsToBuy("0"); }}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-2xl font-black text-[#144542] focus:outline-none focus:ring-2 focus:ring-[#144542]/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none">Credits</div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Amount</span>
              <span className="text-3xl font-black text-[#144542]">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-shrink-0 pt-9">
          <button className="px-10 py-4 bg-[#144542] text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#144542]/20 hover:bg-[#0d2d2b] transition-all active:scale-[0.98]">
            Pay Now
          </button>
          <button className="px-10 py-4 bg-white text-gray-400 text-sm font-bold rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all active:scale-[0.98]">
            Skip Payment
          </button>
        </div>
      </div>
      
      <div className="p-5 bg-[#fffdf2] rounded-2xl border border-[#fcdcb6]/30 flex items-center justify-center gap-4 transition-all hover:bg-[#fffcf0]">
        <div className="flex items-center h-5">
          <input
            id="agreement"
            type="checkbox"
            checked={isAgreed}
            onChange={(e) => onAgreeChange?.(e.target.checked)}
            className="w-5 h-5 accent-[#22c55e] border-gray-300 rounded cursor-pointer"
          />
        </div>
        <label htmlFor="agreement" className="text-xs font-semibold text-[#4a2e10] leading-relaxed cursor-pointer select-none italic text-center">
          By submitting, you agree that the information provided is accurate and represents your legal business entity.
        </label>
      </div>
    </motion.div>
  );
};

export default PaymentStep;
