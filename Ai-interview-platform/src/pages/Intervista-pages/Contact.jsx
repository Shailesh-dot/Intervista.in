import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Lenis from "lenis";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiPhone, FiMapPin, FiChevronRight, FiHelpCircle, FiBriefcase, FiUsers, FiTarget, FiHexagon, FiBox, FiAperture, FiLayers, FiCheckCircle, FiAlertCircle, FiLoader } from "react-icons/fi";
import Navbar from "../../components/layout/Navbar";
import FooterSection from "../landing/FooterSection";

export default function Contact() {
  // â”€â”€ Smooth scroll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  // â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', company: '',
    employees: '', industry: '', country: 'IN', phone: '',
    jobTitle: '', description: '', newsletter: false,
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim()) {
      setErrorMsg('Please fill in at least your first name and email.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setStatus('success');
      setForm({ firstName: '', lastName: '', email: '', company: '', employees: '', industry: '', country: 'IN', phone: '', jobTitle: '', description: '', newsletter: false });
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };



  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans text-[#1a1a1a]">
      <Navbar theme="light" />

      {/* Hero Image Section */}
      <section className="relative w-full h-[70vh] min-h-[500px] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2000&q=80" 
            alt="Contact Us Hero" 
            className="w-full h-full object-cover object-top"
          />
          {/* Orange overlay to match the design's warm tone */}
          <div className="absolute inset-0 bg-[#e87a41] mix-blend-multiply opacity-60"></div>
          {/* Additional gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 flex flex-col items-center justify-center text-white text-center mt-12"
        >
          <span className="text-[20px] font-bold tracking-[0.2em] mb-4 uppercase drop-shadow-md">Contact Us</span>
          <h1 className="text-6xl md:text-[80px] font-medium font-serif tracking-tight drop-shadow-lg leading-none">
            Get in touch
          </h1>
        </motion.div>
      </section>

      {/* Main Content Area */}
      <main className="flex-grow w-full pt-20 pb-0">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 mb-24 items-start">
          
          {/* Left Column */}
          <motion.div 
            initial="hidden" animate="visible" variants={fadeIn}
            className="pt-4"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-orange-200 rounded-full mb-8">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Contact Us</span>
            </div>

            {/* Headings */}
            <h1 className="text-5xl md:text-[64px] font-black text-[#1a1a1a] mb-6 tracking-tighter leading-none">
              Get in <span className="text-[#d93025] italic font-serif font-medium">touch</span>
            </h1>

            <h2 className="text-xl md:text-[22px] font-bold text-gray-600 mb-6">
              We're here to help
            </h2>

            <p className="text-gray-600 text-[15px] leading-relaxed mb-12 max-w-[400px]">
              Intervista Embedded is the easiest way to embed video calls directly into your app, website, or anywhere else you need beautiful, custom video chat â€“ that just works.
            </p>

            <div className="w-full max-w-[400px] h-px bg-gray-100 mb-10"></div>

            {/* Contact Details */}
            <div className="space-y-8 mb-12">
              {/* Email */}
              <div className="flex gap-5">
                <div className="w-10 h-10 rounded-full border border-orange-100 flex items-center justify-center shrink-0">
                  <FiMail className="text-orange-500 w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">Email Us</span>
                  <a href="mailto:teams@intervista.in" className="text-[15px] font-semibold text-[#1a1a1a] hover:text-[#d93025] transition-colors">teams@intervista.in</a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex gap-5">
                <div className="w-10 h-10 rounded-full border border-orange-100 flex items-center justify-center shrink-0">
                  <FiPhone className="text-orange-500 w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">Call Us</span>
                  <a href="tel:+917305162891" className="text-[15px] font-semibold text-[#1a1a1a] hover:text-[#d93025] transition-colors">+91 7305162891</a>
                </div>
              </div>

              {/* Office */}
              <div className="flex gap-5">
                <div className="w-10 h-10 rounded-full border border-orange-100 flex items-center justify-center shrink-0">
                  <FiMapPin className="text-orange-500 w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">Our Office</span>
                  <address className="text-[15px] font-semibold text-[#1a1a1a] not-italic leading-relaxed max-w-[200px]">
                    Suburayan 4th Street;<br />
                    TNHB Colony, Purasaiwakkam;<br />
                    Chennai â€“ 600012;<br />
                    India.
                  </address>
                </div>
              </div>
            </div>

            <div className="w-full max-w-[400px] h-px bg-gray-100 mb-8"></div>

            {/* Trusted By */}
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">Trusted by innovative teams</span>
              <div className="flex items-center gap-6 text-gray-300">
                <FiTarget className="w-5 h-5" />
                <FiHexagon className="w-5 h-5" />
                <FiBox className="w-5 h-5" />
                <FiAperture className="w-5 h-5" />
                <FiLayers className="w-5 h-5" />
              </div>
            </div>
          </motion.div>

          {/* Right Column - Form */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-gray-100 relative"
          >
            <h3 className="text-[22px] font-bold text-[#1a1a1a] mb-2">Let's talk.</h3>
            <p className="text-[13px] text-gray-500 mb-8">Fill out the form and we'll be in touch shortly.</p>

            {/* â”€â”€ Success banner â”€â”€ */}
            <AnimatePresence>
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4 mb-6 text-sm font-semibold"
                >
                  <FiCheckCircle className="shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-bold">Message sent successfully!</p>
                    <p className="font-normal text-green-600 text-xs mt-0.5">We'll get back to you within 1â€“2 business days. Check your inbox for a confirmation email.</p>
                  </div>
                </motion.div>
              )}
              {status === 'error' && errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-4 mb-6 text-sm font-semibold"
                >
                  <FiAlertCircle className="shrink-0" size={18} />
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">First Name*</label>
                  <input type="text" required value={form.firstName} onChange={set('firstName')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Last Name</label>
                  <input type="text" value={form.lastName} onChange={set('lastName')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Work Email*</label>
                <input type="email" required value={form.email} onChange={set('email')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Company Name</label>
                <input type="text" value={form.company} onChange={set('company')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Number of Employees</label>
                  <select value={form.employees} onChange={set('employees')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm text-gray-600 appearance-none bg-white">
                    <option value="">Please Select</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201+">201+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Industry</label>
                  <select value={form.industry} onChange={set('industry')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm text-gray-600 appearance-none bg-white">
                    <option value="">Please Select</option>
                    <option value="tech">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Country</label>
                  <select value={form.country} onChange={set('country')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm text-gray-600 appearance-none bg-white">
                    <option value="IN">India (+91)</option>
                    <option value="US">USA (+1)</option>
                    <option value="UK">UK (+44)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Phone Number</label>
                  <input type="tel" value={form.phone} onChange={set('phone')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Job Title</label>
                <input type="text" value={form.jobTitle} onChange={set('jobTitle')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                <textarea rows={3} value={form.description} onChange={set('description')} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d93025] focus:ring-1 focus:ring-[#d93025] outline-none transition-all text-sm resize-none" />
              </div>

              <div className="flex items-start gap-3 pt-3">
                <input type="checkbox" id="newsletter" checked={form.newsletter} onChange={set('newsletter')} className="mt-1 border-gray-300 text-[#d93025] focus:ring-[#d93025] rounded" />
                <label htmlFor="newsletter" className="text-[12px] text-gray-500 leading-relaxed">
                  I'd like to occasionally receive other communications from Intervista, such as content and product news.
                </label>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-[#d93025] hover:bg-[#b8261e] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-red-500/20 hover:scale-[1.01] active:scale-95"
              >
                {status === 'loading' ? (
                  <>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sendingâ€¦
                  </>
                ) : (
                  <>Send Message <FiChevronRight /></>
                )}
              </button>

              <p className="text-[9px] text-gray-400 text-center leading-relaxed mt-4 px-4">
                Intervista is committed to protecting and respecting your privacy. By clicking send, you agree to our Terms and Privacy Policy.
              </p>
            </form>
          </motion.div>
        </div>
      </main>

      {/* FAQ Section */}
      <section className="bg-[#fcfcfc] py-24 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4">Frequently asked questions</h2>
            <p className="text-gray-500 text-[15px]">Quick answers to questions you may have about Intervista and our services.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FAQ Card 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-6">
                <FiHelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-3">Technical Support</h3>
              <p className="text-gray-500 text-[13px] leading-relaxed mb-6 flex-grow">Need help with integration? Our engineers are available for 1:1 sessions.</p>
              <a href="#" className="text-red-500 text-[13px] font-bold flex items-center gap-1 hover:text-red-600 transition-colors">
                Learn more <FiChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* FAQ Card 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-6">
                <FiBriefcase className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-3">Enterprise Sales</h3>
              <p className="text-gray-500 text-[13px] leading-relaxed mb-6 flex-grow">Looking for customized volume pricing and SLAs? Let's discuss your requirements.</p>
              <a href="#" className="text-red-500 text-[13px] font-bold flex items-center gap-1 hover:text-red-600 transition-colors">
                Learn more <FiChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* FAQ Card 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-6">
                <FiUsers className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-3">General Inquiries</h3>
              <p className="text-gray-500 text-[13px] leading-relaxed mb-6 flex-grow">Any other questions about our roadmap or company? We'd love to chat.</p>
              <a href="#" className="text-red-500 text-[13px] font-bold flex items-center gap-1 hover:text-red-600 transition-colors">
                Learn more <FiChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Footer Matching Design */}
      <FooterSection />
    </div>
  );
}
