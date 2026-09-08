import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FaCheckCircle, FaArrowRight, FaArrowLeft, FaFileInvoiceDollar, FaCreditCard
} from "react-icons/fa";

// Modular Components
import OnboardingSidebar from "./components/onboarding/OnboardingSidebar";
import OnboardingHeader from "./components/onboarding/OnboardingHeader";
import GeneralInfoStep from "./components/onboarding/GeneralInfoStep";
import BillingInfoStep from "./components/onboarding/BillingInfoStep";
import PaymentStep from "./components/onboarding/PaymentStep";

const CompanyInfoOnboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    // General Details
    companyId: localStorage.getItem("companyId") || "",
    website: "",
    industry: "",
    companySize: "",
    foundedYear: 0,
    description: "",
    logoUrl: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    linkedinUrl: "",
    githubUrl: "",
    // Billing Details
    billingName: "",
    billingEmail: "",
    billingPhone: "",
    gstin: "",
    isGstRegistered: false,
    billingLine1: "",
    billingLine2: "",
    billingCity: "",
    billingState: "",
    billingPostalCode: "",
    billingCountry: "",
    currency: "USD"
  });

  const steps = [
    { id: 1, title: "General Details", icon: <FaCreditCard /> },
    { id: 2, title: "Billing Details", icon: <FaFileInvoiceDollar /> },
    { id: 3, title: "Payment", icon: <FaCheckCircle /> }
  ];

  useEffect(() => {
    // If there is no company ID, redirect to login
    if (!localStorage.getItem("companyId")) {
      navigate("/company/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const email = localStorage.getItem("companyEmail");
        if (!email) return;

        const token = localStorage.getItem("companyToken");
        if (!token) return;

        const response = await fetch(`/api/user/auth/profile/${encodeURIComponent(email)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            billingName: data.name || "",
            billingEmail: email || "",
            billingPhone: "" // No phone in user profile by default
          }));
        }
      } catch (error) {
        console.error("Error fetching company profile:", error);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateStep = (step) => {
    setMessage({ text: "", type: "" });
    if (step === 1) {
      const required = ['industry', 'companySize', 'foundedYear', 'description', 'logoUrl', 'addressLine1', 'city', 'state', 'country', 'postalCode'];
      const missing = required.filter(field => !formData[field] || String(formData[field]).trim() === "");
      if (missing.length > 0) {
        setMessage({ text: "Please fill all required fields, including the company logo.", type: "error" });
        return false;
      }
    } else if (step === 2) {
      const required = ['billingName', 'billingEmail', 'billingPhone', 'billingLine1', 'billingCity', 'billingState', 'billingCountry', 'billingPostalCode'];
      const missing = required.filter(field => !formData[field] || String(formData[field]).trim() === "");
      if (missing.length > 0) {
        setMessage({ text: "Please fill all required billing details.", type: "error" });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage({ text: "", type: "" });

    if (!formData.companyId) {
      setMessage({ text: "Company ID missing. Please log in again.", type: "error" });
      setTimeout(() => navigate("/company/login"), 2000);
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("companyToken");
      // 1. Submit Company Info (Includes Billing in the new DTO if configured, otherwise we'll just hit the info endpoint)
      const companyResponse = await fetch("/api/company/profile/info", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
           website: formData.website,
           industry: formData.industry,
           companySize: formData.companySize,
           foundedYear: parseInt(formData.foundedYear),
           description: formData.description,
           logoUrl: formData.logoUrl,
           addressLine1: formData.addressLine1,
           addressLine2: formData.addressLine2,
           city: formData.city,
           state: formData.state,
           country: formData.country,
           postalCode: formData.postalCode,
           linkedinUrl: formData.linkedinUrl,
           githubUrl: formData.githubUrl,
           // Note: In the new backend, billing info might be separate or merged. 
           // I'll check the DTO, but for now I'll send it here.
           billingName: formData.billingName,
           billingEmail: formData.billingEmail,
           billingPhone: formData.billingPhone,
           gstin: formData.gstin,
           isGstRegistered: formData.isGstRegistered
        })
      });

      if (!companyResponse.ok) {
        throw new Error(`Profile update failed: ${await companyResponse.text()}`);
      }

      setMessage({ text: "Profile details saved successfully!", type: "success" });
      setTimeout(() => navigate("/company/dashboard"), 2000);

    } catch (err) {
      setMessage({ text: err.message || "Server connection error. Please try again later.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <GeneralInfoStep formData={formData} handleInputChange={handleInputChange} setFormData={setFormData} />;
      case 2:
        return <BillingInfoStep formData={formData} handleInputChange={handleInputChange} />;
      case 3:
        return <PaymentStep formData={formData} isAgreed={isAgreed} onAgreeChange={setIsAgreed} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-[#F8FAFA] flex overflow-hidden">
      {/* Sidebar Indicator */}
      <OnboardingSidebar steps={steps} currentStep={currentStep} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center py-12 px-6 md:px-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl w-full">
          {/* Header Mobile Only */}
          <OnboardingHeader steps={steps} currentStep={currentStep} />

          {/* Form Message */}
          {message.text && (
            <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
              <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}></div>
              <p className="text-sm font-bold">{message.text}</p>
            </div>
          )}

          {/* Step Renderer */}
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="mt-12 pt-10 border-t border-brand-light flex justify-between items-center bg-white lg:bg-transparent -mx-6 lg:mx-0 px-6 lg:px-0 sticky bottom-0 lg:static pb-6 lg:pb-0 z-20">
            <button 
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
              className={`flex items-center gap-2 px-6 py-3.5 font-bold text-brand-dark rounded-xl transition-all ${currentStep === 1 ? 'opacity-0' : 'hover:bg-brand-light/50 active:scale-95'}`}
            >
              <FaArrowLeft size={12}/> Back
            </button>

            {currentStep < steps.length ? (
              <button 
                onClick={nextStep}
                className="flex items-center gap-2 px-8 py-3.5 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 hover:shadow-xl hover:shadow-brand-dark/40 active:scale-95 transition-all group"
              >
                Next <FaArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || (currentStep === 3 && !isAgreed)}
                className="flex items-center gap-2 px-10 py-3.5 bg-brand-secondary text-brand-dark font-bold rounded-xl shadow-lg shadow-brand-secondary/20 hover:shadow-xl hover:shadow-brand-secondary/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Profile"} <FaCheckCircle size={14}/>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfoOnboarding;
