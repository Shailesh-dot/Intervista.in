import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiUser, FiMail, FiPhone, FiBriefcase, FiLayers, FiLock, FiCheck, FiShield, FiEye, FiEyeOff } from "react-icons/fi";

export default function AddHRModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    designation: "",
    department: "",
    password: "",
    confirmPassword: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [emailVerified, setEmailVerified] = useState(false);
  const [isWaitingForVerification, setIsWaitingForVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Poll for verification status
  useEffect(() => {
    let interval;
    if (isWaitingForVerification && formData.email && !emailVerified) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/check-verification/${encodeURIComponent(formData.email)}`);
          const data = await res.json();
          if (data.verified) {
            setEmailVerified(true);
            setIsWaitingForVerification(false);
            setMessage({ text: "Email verified successfully!", type: "success" });
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWaitingForVerification, formData.email, emailVerified]);

  const handleVerifyEmail = async () => {
    if (!formData.email || !formData.name) {
      setMessage({ text: "Please enter Name and Email to verify.", type: "error" });
      return;
    }

    try {
      const token = localStorage.getItem("companyToken");
      // 1. Check if email already registered in HR DB
      const existsRes = await fetch(`/api/company/hr/exists?email=${encodeURIComponent(formData.email)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const existsData = await existsRes.json();
      
      if (existsData.registered) {
        setMessage({ text: "This email is already registered as an HR.", type: "error" });
        setIsSubmitting(false);
        return;
      }

      // 2. Real verification call
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email })
      });
      
      if (response.ok) {
        setIsWaitingForVerification(true);
        setMessage({ text: `Verification link sent to ${formData.email}. Please check your inbox.`, type: "success" });
      } else {
        const err = await response.json();
        setMessage({ text: err.error || "Failed to send verification email", type: "error" });
      }

    } catch (err) {
      setMessage({ text: "Error connecting to servers.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: "", type: "" });

    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      setMessage({ text: "Company ID missing. Please log in again.", type: "error" });
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("companyToken");
      const response = await fetch("/api/company/hr/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          designation: formData.designation,
          department: formData.department,
          password: formData.password
        })
      });

      if (response.ok) {
        setMessage({ text: "HR Registered successfully!", type: "success" });
        setTimeout(() => {
          onClose();
          setFormData({
            name: "",
            email: "",
            phoneNumber: "",
            designation: "",
            department: "",
            password: "",
            confirmPassword: ""
          });
          setEmailVerified(false);
          setMessage({ text: "", type: "" });
        }, 2000);
      } else {
        const error = await response.text();
        setMessage({ text: `Failed: ${error}`, type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Connection error. Please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#144542] p-6 text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Add New HR</h2>
              <p className="text-[#DAFF0C]/80 text-xs font-medium uppercase tracking-wider mt-1">Personnel Registration</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
            >
              <FiX size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 ${
                message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
              }`}>
                <div className={`w-2 h-2 rounded-full ${message.type === "success" ? "bg-green-600" : "bg-red-600"}`} />
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#144542]/50 uppercase ml-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><FiUser size={14}/></span>
                  <input 
                    required
                    name="name"
                    disabled={emailVerified || isWaitingForVerification}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#144542]/5 transition-all text-sm disabled:opacity-50"
                    placeholder="Enter name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#144542]/50 uppercase ml-1">Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><FiMail size={14}/></span>
                  <input 
                    required
                    type="email"
                    name="email"
                    disabled={emailVerified || isWaitingForVerification}
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#144542]/5 transition-all text-sm disabled:opacity-50"
                    placeholder="email@company.com"
                  />
                </div>
              </div>

              {!emailVerified && (
                <div className="col-span-1 md:col-span-2">
                  <button 
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={isSubmitting || isWaitingForVerification}
                    className="w-full py-4 bg-[#144542] text-[#DAFF0C] font-black rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {isWaitingForVerification ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#DAFF0C] border-t-transparent rounded-full animate-spin" />
                        <span>Waiting for Verification...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Email to Proceed</span>
                        <FiShield className="group-hover:rotate-12 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {emailVerified && (
                <>
                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#144542]/50 uppercase ml-1">Phone Number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><FiPhone size={14}/></span>
                      <input 
                        required
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#144542]/5 transition-all text-sm"
                        placeholder="+91 00000 00000"
                      />
                    </div>
                  </div>

                  {/* Designation */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#144542]/50 uppercase ml-1">Designation</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><FiBriefcase size={14}/></span>
                      <input 
                        required
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#144542]/5 transition-all text-sm"
                        placeholder="HR Manager"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#144542]/50 uppercase ml-1">Department</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><FiLayers size={14}/></span>
                      <input 
                        required
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#144542]/5 transition-all text-sm"
                        placeholder="Human Resources"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#144542]/50 uppercase ml-1">Password</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><FiLock size={14}/></span>
                      <input 
                        required
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#144542]/5 transition-all text-sm"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#144542] transition-colors"
                      >
                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#144542]/50 uppercase ml-1">Confirm Password</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><FiLock size={14}/></span>
                      <input 
                        required
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#144542]/5 transition-all text-sm"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#144542] transition-colors"
                      >
                        {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {emailVerified && (
              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#DAFF0C] text-[#144542] font-black rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-[#144542] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete HR registration</span>
                      <FiCheck className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
