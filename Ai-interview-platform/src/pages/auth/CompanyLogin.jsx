import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { IoMdArrowRoundBack } from "react-icons/io";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import bgImage from "../../assets/images/login_register_BG.png";
import SplitText from "../../components/animations/SplitText";
import BlurText from "../../components/animations/BlurText";

gsap.registerPlugin(useGSAP);

export default function CompanyLogin() {
  const [view, setView] = useState("login"); // login, forgot, verify, reset
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  
  // Message state
  const [message, setMessage] = useState({ text: "", type: "" }); // type: "success" | "error"
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const messageRef = useRef(null);

  // Auto-switch to reset view if ?token= is in the URL (came from email link)
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) setView("reset");
  }, [searchParams]);

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
    // Auto clear success messages after some time, keep errors until next action
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

  // Load pre-filled email from registration
  useEffect(() => {
    const savedEmail = localStorage.getItem("companyEmail");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" }); // Clear previous messages
    
    if (!email || !password) {
      showMessage("Please fill in all fields", "error");
      shakeForm();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;
        const companyId = data.companyId;
        const role = data.role;

        if (role !== "company") {
          showMessage("Invalid account type for company login", "error");
          setIsLoading(false);
          return;
        }

        localStorage.setItem("companyToken", token);
        localStorage.setItem("companyEmail", email);
        if (companyId) localStorage.setItem("companyId", companyId);
        
        showMessage("Login successful! Checking profile status...", "success");

        // Check if company profile is already filled
        try {
          const checkResponse = await fetch("/api/company/profile", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          
          if (checkResponse.ok) {
            const info = await checkResponse.json();
            
            // Check if essential details are filled
            const isProfileFilled = info && 
                                   info.industry && 
                                   info.companySize && 
                                   info.description && 
                                   info.city;

            if (isProfileFilled) {
              showMessage("Login successful! Redirecting to dashboard...", "success");
              setTimeout(() => navigate("/company/dashboard"), 1500);
            } else {
              showMessage("Login successful! Please complete your company profile.", "success");
              setTimeout(() => navigate("/company/setup"), 1500);
            }
          } else {
            // Profile not found or error, go to setup
            showMessage("Welcome! Let's set up your company profile.", "success");
            setTimeout(() => navigate("/company/setup"), 1500);
          }
        } catch (error) {
          console.error("Profile check error:", error);
          setTimeout(() => navigate("/company/setup"), 1500);
        }
      } else {
        const textResponse = await response.text();
        let errorData = {};
        try { errorData = textResponse ? JSON.parse(textResponse) : {}; } catch(e) {
          errorData = { message: textResponse || "Login failed" };
        }
        showMessage(typeof errorData === 'string' ? errorData : (errorData.message || errorData.title || "Login failed"), "error");
        shakeForm();
      }
    } catch (error) {
      console.error("Login error:", error);
      showMessage("Invalid Email or Password", "error");
      shakeForm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    
    if (!email) {
      showMessage("Please enter your email", "error");
      shakeForm();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      // Always show success to prevent account enumeration
      showMessage("If your company account exists, a reset link has been sent to your email.", "success");
      setView("verify");
    } catch (error) {
      console.error("Forgot password error:", error);
      showMessage("Error connecting to server.", "error");
      shakeForm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    
    if (password !== confirmPassword) {
      showMessage("Passwords do not match", "error");
      shakeForm();
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      showMessage("Invalid or missing reset link. Please click the link from your email.", "error");
      shakeForm();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token,
          newPassword: password,
          confirmPassword: confirmPassword
        })
      });

      if (response.ok) {
        showMessage("Password updated successfully! Please login.", "success");
        setView("login");
        setPassword("");
        setConfirmPassword("");
      } else {
        const textResponse = await response.text();
        let errorData = {};
        try { errorData = textResponse ? JSON.parse(textResponse) : {}; } catch(e) {
          errorData = { message: textResponse || "Reset failed" };
        }
        showMessage(typeof errorData === 'string' ? errorData : (errorData.error || errorData.message || errorData.title || "Reset failed"), "error");
        shakeForm();
      }
    } catch (error) {
      console.error("Reset error:", error);
      showMessage("Error connecting to server.", "error");
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
              alt="Login Background" 
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
            
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-0"></div>

            <div className="relative z-10">
              <Link to="/" className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white text-3xl font-bold hover:bg-white/30 transition-all">
                <IoMdArrowRoundBack />
              </Link>
            </div>

            <div className="relative z-10 text-white">
              <BlurText 
                text="Streamline everything" 
                className="text-white/90 text-lg mb-4 font-regular italic block" 
                variant="letter"
                stagger={0.05}
              />
              <h2 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight drop-shadow-md">
                <SplitText 
                  text="Your hiring center" 
                  className="block" 
                  variant="word"
                  stagger={0.15}
                  delay={0.5}
                />
                <SplitText 
                  text="to manage candidates," 
                  className="block" 
                  variant="word"
                  stagger={0.15}
                  delay={1}
                />
                <SplitText 
                  text="evaluate smartly" 
                  className="block" 
                  variant="word"
                  stagger={0.15}
                  delay={1.5}
                />
              </h2>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form (60% Width) */}
        <div className="w-full lg:w-[55%] p-8 md:p-16 flex flex-col justify-center h-full bg-white relative overflow-y-auto">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-10 text-center lg:text-left gsap-fade-in">
              <Link to="/" className="w-12 h-12 bg-brand-dark rounded-xl flex lg:hidden items-center justify-center mb-6 mx-auto overflow-hidden shadow-lg shadow-brand-dark/20 active:scale-95 transition-transform">
                <img src="/logo.jpg" alt="Knitnet Logo" className="w-full h-full object-cover" />
              </Link>
              <h1 className="text-4xl font-black text-brand-dark mb-4 tracking-tight">
                {view === "login" && "Company Login"}
                {view === "forgot" && "Reset Password"}
                {view === "verify" && "Verify Email"}
                {view === "reset" && "Create New Password"}
              </h1>
              <p className="text-brand-gray text-sm leading-relaxed">
                {view === "login" && "Access your company dashboard to manage candidates and evaluations."}
                {view === "forgot" && "Enter your company email to receive a password reset link."}
                {view === "verify" && "Please click the verification link sent to your email."}
                {view === "reset" && "Set your new password to regain access to your account."}
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

            {view === "login" && (
              <form ref={formRef} className="space-y-6" onSubmit={handleLogin}>
                <div className="gsap-fade-in">
                  <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                    Company email
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter company email" 
                    className={`w-full px-5 py-4 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm ${message.type === "error" ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-brand-dark"}`}
                  />
                </div>

                <div className="gsap-fade-in">
                  <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                    Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password" 
                      className={`w-full px-5 py-4 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 transition-all text-sm ${message.type === "error" ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-brand-dark"}`}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-dark transition-colors"
                    >
                      {showPassword ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </div>
                  <div className="mt-2 text-right">
                    <button 
                      type="button" 
                      onClick={() => setView("forgot")}
                      className="text-xs font-bold text-brand-dark hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="gsap-fade-in relative w-full mt-5 py-4 bg-brand-dark text-white font-bold tracking-wide rounded-xl overflow-hidden shadow-lg shadow-brand-dark/30 hover:shadow-xl hover:shadow-brand-dark/50 hover:bg-[#1a1c23] transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                >
                  <span className="relative z-10">{isLoading ? "Logging in..." : "Login Now"}</span>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]"></div>
                </button>
              </form>
            )}

            {view === "forgot" && (
              <form ref={formRef} className="space-y-6" onSubmit={handleForgot}>
                <div className="gsap-fade-in">
                  <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                    Company email
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter company email" 
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 focus:border-brand-dark transition-all text-sm"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full mt-4 py-4 bg-brand-dark text-white font-black rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-dark/20 active:scale-[0.98] disabled:opacity-70"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
                
                <p className="text-center text-sm text-brand-gray font-medium">
                  Remember your password? <button type="button" onClick={() => setView("login")} className="text-brand-dark font-black hover:underline">Log in</button>
                </p>
              </form>
            )}

            {view === "verify" && (
              <div className="text-center space-y-6 py-8 gsap-fade-in">
                <div className="w-16 h-16 bg-brand-dark/5 text-brand-dark rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  ✉️
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-brand-dark">Check your inbox</h2>
                  <p className="text-brand-gray text-sm leading-relaxed max-w-sm mx-auto">
                    We've sent a password reset link to <strong className="text-brand-dark">{email}</strong>. Please open your email and click the link to create a new password.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-3 items-center">
                  <button 
                    type="button" 
                    onClick={handleForgot}
                    disabled={isLoading}
                    className="text-xs font-bold text-brand-dark hover:underline disabled:opacity-50"
                  >
                    {isLoading ? "Resending..." : "Didn't receive email? Resend"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setView("forgot")}
                    className="text-xs font-bold text-brand-gray hover:text-brand-dark hover:underline"
                  >
                    ← Use a different email
                  </button>
                </div>
              </div>
            )}

            {view === "reset" && !searchParams.get("token") && (
              <div className="text-center space-y-6 py-8 gsap-fade-in">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                  ⚠️
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-brand-dark">Invalid Reset Link</h2>
                  <p className="text-brand-gray text-sm leading-relaxed max-w-sm mx-auto">
                    No valid reset token was detected. Please click the reset link directly from your email to set a new password.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setView("forgot")}
                  className="px-6 py-3 bg-brand-dark text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all"
                >
                  Request New Link
                </button>
              </div>
            )}

            {view === "reset" && searchParams.get("token") && (
              <form ref={formRef} className="space-y-6" onSubmit={handleReset}>
                <div className="gsap-fade-in">
                  <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                    New Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••" 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 focus:border-brand-dark transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="gsap-fade-in">
                  <label className="block text-sm font-bold text-brand-dark mb-1 pl-3">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••" 
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-dark/5 focus:border-brand-dark transition-all text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="gsap-fade-in relative w-full mt-5 py-4 bg-brand-dark text-white font-bold tracking-wide rounded-xl overflow-hidden shadow-lg shadow-brand-dark/30 hover:shadow-xl hover:shadow-brand-dark/50 hover:bg-[#1a1c23] transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                >
                  <span className="relative z-10">{isLoading ? "Updating..." : "Update Password"}</span>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite]"></div>
                </button>
              </form>
            )}

            <div className="relative my-10 gsap-fade-in">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase px-4">
                <span className="bg-white px-2 text-brand-gray font-bold tracking-widest">or continue with</span>
              </div>
            </div>

            <p className="text-center text-sm text-brand-gray font-medium gsap-fade-in">
              Don't have a company account? <Link to="/company/register" className="text-brand-dark font-black hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
    </div>
  );
}