import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { IoMdArrowRoundBack } from "react-icons/io";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import bgImage from "../../assets/images/login_register_BG.png";
import SplitText from "../../components/animations/SplitText";
import BlurText from "../../components/animations/BlurText";

gsap.registerPlugin(useGSAP);

export default function UserRegister() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForVerification, setIsWaitingForVerification] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Message state
  const [message, setMessage] = useState({ text: "", type: "" }); // type: "success" | "error"
  
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const messageRef = useRef(null);

  // Initial Entrance Animation
  useGSAP(() => {
    gsap.fromTo(
      ".gsap-fade-in",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out", delay: 0.2 }
    );
  }, { scope: containerRef });

  // Animate Message Banner
  useGSAP(() => {
    if (message.text) {
      gsap.fromTo(
        messageRef.current,
        { y: -20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    }
  }, [message]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    if (type === "success") {
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    }
  };

  const shakeForm = () => {
    gsap.fromTo(
      formRef.current,
      { x: -10 },
      { x: 10, duration: 0.1, yoyo: true, repeat: 5, ease: "linear", onComplete: () => gsap.set(formRef.current, { x: 0 }) }
    );
  };


  // Simple email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Password requirements
  const passwordRules = [
    { id: "length",    label: "6 to 9 characters",                    test: (p) => p.length >= 6 && p.length <= 9 },
    { id: "number",    label: "At least 1 number",                     test: (p) => /[0-9]/.test(p) },
    { id: "symbol",    label: "At least 1 symbol (@, #, $, etc.)",     test: (p) => /[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]/.test(p) },
    { id: "case",      label: "At least 1 uppercase & 1 lowercase",    test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  ];

  const isPasswordValid = (p) => passwordRules.every((r) => r.test(p));

  const handleVerifyEmail = async () => {
    setMessage({ text: "", type: "" });
    if (!email) {
      showMessage("Please enter your email", "error");
      shakeForm();
      return;
    }

    if (!emailRegex.test(email)) {
      showMessage("Please enter a valid email format (e.g., name@example.com)", "error");
      shakeForm();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        showMessage("Verification email sent! Please check your inbox and click the link.", "success");
        setIsWaitingForVerification(true);

        // Start polling for verification status
        const pollInterval = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/check-verification/${email}`);
            const data = await checkRes.json();
            
            if (data.verified) {
              clearInterval(pollInterval);
              setIsWaitingForVerification(false);
              setEmailVerified(true);
              showMessage("Email verified successfully! You can now create your password.", "success");
            }
          } catch (e) {
            console.error("Polling error", e);
          }
        }, 3000); // Check every 3 seconds

        // Stop polling if user navigates away (cleanup on unmount not strictly needed here, but good practice if it was an effect. We'll rely on the user completing the flow or refreshing)
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || "Failed to send verification email.", "error");
      }
    } catch (error) {
      console.error("Verification error:", error);
      showMessage("Error connecting to verification server at port 5000.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!fullName || !password || !confirmPassword) {
      showMessage("Please fill in all fields", "error");
      shakeForm();
      return;
    }

    if (!isPasswordValid(password)) {
      showMessage("Password does not meet all requirements.", "error");
      shakeForm();
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Passwords do not match", "error");
      shakeForm();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/auth/signup/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email,
          password,
          confirmPassword
        })
      });

      if (response.ok) {
        showMessage("Account created successfully! Redirecting to login...", "success");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        let errorData;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
        } else {
            const textError = await response.text();
            errorData = { message: "Server Error", details: textError };
        }

        const displayMessage = errorData.details 
            ? `${errorData.error || errorData.message || "Error"}: ${errorData.details}`
            : (errorData.error || errorData.message || "Registration failed");
            
        showMessage(displayMessage, "error");
        shakeForm();
      }
    } catch (error) {
      console.error("Registration error:", error);
      showMessage("Error connecting to the server. Please ensure the backend is running at http://localhost:5280", "error");
      shakeForm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="flex min-h-screen h-[100dvh] w-full bg-white overflow-hidden">
        
        {/* Left Side - Image Background */}
        <div className="hidden lg:flex w-[45%] p-4 bg-white">
          <div className="w-full h-full relative rounded-[2rem] overflow-hidden flex flex-col justify-between p-8">
            <img 
              src={bgImage} 
              alt="Register Background" 
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
            
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-0"></div>

            <div className="relative z-10">
              <Link to="/login" className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white text-3xl font-bold hover:bg-white/30 transition-all">
                <IoMdArrowRoundBack />
              </Link>
            </div>

            <div className="relative z-10 text-white">
              <BlurText 
                text="Join us today" 
                className="text-white/90 text-lg mb-4 font-regular italic block" 
                variant="letter"
                stagger={0.05}
              />
              <h2 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight drop-shadow-md">
                <SplitText 
                  text="Start your journey" 
                  className="block" 
                  variant="word"
                  stagger={0.15}
                  delay={0.5}
                />
                <SplitText 
                  text="towards smarter" 
                  className="block" 
                  variant="word"
                  stagger={0.15}
                  delay={1}
                />
                <SplitText 
                  text="evaluations" 
                  className="block" 
                  variant="word"
                  stagger={0.15}
                  delay={1.5}
                />
              </h2>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form (60% Width) */}
        <div className="w-full lg:w-[55%] p-8 md:p-16 flex justify-center h-full bg-white relative overflow-y-auto">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8 text-center lg:text-left gsap-fade-in">
              <Link to="/" className="w-12 h-12 bg-brand-dark rounded-xl flex lg:hidden items-center justify-center mb-6 mx-auto overflow-hidden shadow-lg shadow-brand-dark/20 active:scale-95 transition-transform">
                <img src="/logo.jpg" alt="Knitnet Logo" className="w-full h-full object-cover" />
              </Link>
              <h1 className="text-4xl font-black text-brand-dark mb-4 tracking-tight">
                Create an account
              </h1>
              <p className="text-brand-gray text-sm leading-relaxed">
                Sign up to unlock your personal workspace, track your progress, and excel in every evaluation.
              </p>
            </div>

            {/* GSAP Animated Message Banner */}
            {message.text && (
              <div
                ref={messageRef}
                className={`mb-6 p-4 rounded-xl font-bold text-sm flex items-center gap-3 gsap-fade-in ${
                  message.type === "success" 
                    ? "bg-green-100 text-green-800 border border-green-200" 
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${message.type === "success" ? "bg-green-600" : "bg-red-600"}`}></div>
                {message.text}
              </div>
            )}

            <form ref={formRef} className="space-y-5" onSubmit={handleRegister}>
              <div className="gsap-fade-in">
                <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                  Full Name
                </label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name" 
                  className={`w-full px-5 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm ${message.type === "error" && (!fullName) ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-brand-dark"}`}
                />
              </div>

              <div className="gsap-fade-in">
                <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                  Email
                </label>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={emailVerified}
                    placeholder="Enter your email" 
                    className={`w-full px-5 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm disabled:bg-gray-100 disabled:text-gray-500 ${message.type === "error" && (!email || !emailRegex.test(email)) ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-brand-dark"}`}
                  />
                  {!emailVerified && !isWaitingForVerification && (
                    <button 
                      type="button" 
                      onClick={handleVerifyEmail}
                      disabled={isLoading}
                      className="relative px-8 py-3.5 flex items-center justify-center cursor-pointer bg-brand-dark text-white font-bold tracking-wide rounded-xl overflow-hidden shadow-md shadow-brand-dark/20 hover:shadow-lg hover:shadow-brand-dark/40 hover:bg-[#1a1c23] transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] whitespace-nowrap disabled:opacity-60 disabled:pointer-events-none group"
                    >
                      <span className="relative z-10">{isLoading ? "Sending..." : "Verify"}</span>
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]"></div>
                    </button>
                  )}
                  {isWaitingForVerification && !emailVerified && (
                    <div className="px-6 py-3.5 bg-yellow-100 text-yellow-800 font-bold rounded-xl whitespace-nowrap flex items-center gap-2">
                       <span className="w-4 h-4 rounded-full border-2 border-yellow-800 border-t-transparent animate-spin"></span>
                       Waiting...
                    </div>
                  )}
                  {emailVerified && (
                    <div className="px-6 py-3.5 bg-green-100 text-green-800 font-bold rounded-xl whitespace-nowrap flex items-center gap-2">
                       ✓ Verified
                    </div>
                  )}
                </div>
              </div>

              {emailVerified && (
                <>
                  <div className="gsap-fade-in">
                    <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                      Password
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••" 
                        className={`w-full px-5 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm ${message.type === "error" && (!password) ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-brand-dark"}`}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-dark transition-colors"
                      >
                        {showPassword ? <FaEye /> : <FaEyeSlash />}
                      </button>
                    </div>

                    {/* Live Password Requirements Checklist */}
                    {password.length > 0 && (
                      <div className="mt-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Password Requirements</p>
                        {passwordRules.map((rule) => {
                          const passed = rule.test(password);
                          return (
                            <div key={rule.id} className="flex items-center gap-2.5">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                                passed ? "bg-green-500" : "bg-gray-200"
                              }`}>
                                {passed ? (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                )}
                              </div>
                              <span className={`text-xs font-semibold transition-colors duration-300 ${
                                passed ? "text-green-600" : "text-gray-400"
                              }`}>
                                {rule.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="gsap-fade-in">
                    <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••" 
                        className={`w-full px-5 py-3.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm ${message.type === "error" && password !== confirmPassword ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-brand-dark"}`}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-dark transition-colors"
                      >
                        {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="gsap-fade-in relative w-full mt-6 py-4 bg-brand-dark text-white font-bold tracking-wide rounded-xl overflow-hidden shadow-lg shadow-brand-dark/30 hover:shadow-xl hover:shadow-brand-dark/50 hover:bg-[#1a1c23] transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none group"
                  >
                    <span className="relative z-10">Create Account</span>
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]"></div>
                  </button>
                </>
              )}
            </form>

            <div className="relative my-8 gsap-fade-in">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase px-2">
                <span className="bg-white px-2 text-brand-gray font-bold tracking-widest">or sign up with</span>
              </div>
            </div>

            <p className="text-center text-sm text-brand-gray font-medium pb-12 gsap-fade-in">
              Already have an account? <Link to="/login" className="text-brand-dark font-black hover:underline">Log in</Link>
            </p>
          </div>
        </div>

    </div>
  );
}