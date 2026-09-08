import React, { useState } from "react";
import { motion } from "framer-motion";
import { FiUser, FiMail, FiCalendar, FiMapPin, FiPhone, FiBookOpen, FiArrowRight, FiCheckCircle, FiCamera } from "react-icons/fi";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const profileApi = axios.create({
  baseURL: "/api/user",
});

const SubmitProfile = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [formData, setFormData] = useState({
    name: "",
    email: localStorage.getItem("userEmail") || "",
    dob: "",
    age: "",
    college: "",
    address: "",
    phone: "",
    gender: "",
    photo: null,
    photoUrl: "",
  });

  const showMessage = (text, type = "error") => {
    setMessage({ text, type });
    if (type === "error") {
      // Auto-clear error messages after 5 seconds
      setTimeout(() => setMessage({ text: "", type: "" }), 5000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [name]: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    setIsSubmitting(true);

    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("authToken");
      if (!userId || !token) {
        showMessage("Session expired. Please login again.", "error");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      // Step 1: Upload photo first
      let photoUrl = "";
      if (formData.photo) {
        const photoFormData = new FormData();
        photoFormData.append("photo", formData.photo);

        try {
          const photoResponse = await profileApi.post("/profile/upload-photo", photoFormData, {
            headers: { 
              "Content-Type": "multipart/form-data",
              "Authorization": `Bearer ${token}`
            },
          });
          photoUrl = photoResponse.data.photoUrl;
        } catch (photoError) {
          console.error("Error uploading photo:", photoError);
          const detail = photoError.response?.data?.details || photoError.message;
          showMessage(`Failed to upload profile picture: ${detail}`, "error");
          setIsSubmitting(false);
          return;
        }
      } else {
        showMessage("Please upload a profile picture.", "error");
        setIsSubmitting(false);
        return;
      }

      // Step 2: Create profile with photoUrl
      const submissionData = new FormData();
      submissionData.append("UserId", userId);
      submissionData.append("FullName", formData.name);
      submissionData.append("Email", formData.email);
      submissionData.append("Dob", formData.dob);
      submissionData.append("Age", formData.age);
      submissionData.append("College", formData.college);
      submissionData.append("Address", formData.address);
      submissionData.append("Phone", formData.phone);
      submissionData.append("Gender", formData.gender);
      submissionData.append("PhotoUrl", photoUrl);

      const response = await profileApi.post("/profile/create", submissionData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
      });

      if (response.status === 200 || response.status === 201) {
        localStorage.setItem("userName", formData.name);
        setSubmitted(true);
        setTimeout(() => navigate("/user/dashboard"), 3000);
      }
    } catch (error) {
      console.error("Error submitting profile:", error);
      let errorMsg = "Failed to submit profile. Please try again.";

      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMsg = error.response.data;
        } else if (error.response.data.errors) {
          errorMsg = Object.values(error.response.data.errors).flat().join("\n");
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        } else {
          errorMsg = JSON.stringify(error.response.data, null, 2);
        }
      }
      showMessage(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md w-full bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden text-center"
        >
          <div className="p-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-[#144542] rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <FiCheckCircle className="text-[#DAFF0C] text-5xl" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-[#144542] mb-3"
            >
              Profile Submitted!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-500 font-medium mb-2"
            >
              Your profile has been sent for review. We'll notify you once it's approved.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-[#144542]/60 font-medium"
            >
              Redirecting to dashboard...
            </motion.p>
          </div>
          <div className="bg-[#144542] py-4 px-10">
            <p className="text-[#DAFF0C] text-xs font-bold uppercase tracking-widest">Intervista Platform</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="p-8 md:p-12 bg-[#144542] text-white relative overflow-hidden">
            <div className="relative z-10">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl md:text-4xl font-black mb-2"
              >
                Complete Your Profile
              </motion.h1>
              <p className="text-[#DAFF0C] font-medium tracking-wide uppercase text-sm">
                Participation in Interviews Requires Profile Details
              </p>
            </div>
            {/* Decorative background element */}
            <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-[#DAFF0C] rounded-full blur-[100px] opacity-20" />
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-12">
            
            {/* Error/Success Message */}
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 mb-8 rounded-xl flex items-start gap-3 border ${
                  message.type === "success" 
                    ? "bg-[#144542]/5 border-[#144542]/10 text-[#144542]" 
                    : "bg-red-50 border-red-100 text-red-600"
                }`}
              >
                <div className="flex-1 font-medium text-sm">
                  {message.text}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Personal Information Section */}
              <div className="md:col-span-2">
                <h3 className="text-xl font-black text-[#144542] mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#144542]/5 flex items-center justify-center">
                    <FiUser className="text-[#144542]" />
                  </span>
                  Personal Information
                </h3>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#144542] transition-colors">
                    <FiUser />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#144542] transition-colors">
                    <FiMail />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    readOnly
                    className="w-full pl-11 pr-5 py-4 bg-gray-100 border border-gray-200 rounded-2xl focus:outline-none text-sm font-medium text-gray-500 cursor-not-allowed italic"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              {/* DOB */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Date of Birth</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#144542] transition-colors">
                    <FiCalendar />
                  </div>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium appearance-none"
                  required
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* College */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">College/Institution</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#144542] transition-colors">
                    <FiBookOpen />
                  </div>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                    placeholder="Enter college name"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#144542] transition-colors">
                    <FiPhone />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                </div>
              </div>

              {/* Age */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                  placeholder="Enter age"
                  required
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Detailed Address</label>
                <div className="relative group">
                  <div className="absolute top-4 left-4 pointer-events-none text-gray-400 group-focus-within:text-[#144542] transition-colors">
                    <FiMapPin />
                  </div>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                    className="w-full pl-11 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium resize-none"
                    placeholder="Enter your complete address..."
                    required
                  ></textarea>
                </div>
              </div>

              {/* Profile Photo Upload */}
              <div className="md:col-span-2 space-y-2">
                <h3 className="text-xl font-black text-[#144542] mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#144542]/5 flex items-center justify-center">
                    <FiCamera className="text-[#144542]" />
                  </span>
                  Profile Picture
                </h3>
                <p className="text-gray-500 text-sm mb-6 ml-11 font-medium">Please upload a clear professional photo</p>

                <div className="relative group">
                  <input
                    type="file"
                    id="photo-upload"
                    name="photo"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*"
                    required
                  />
                  <label
                    htmlFor="photo-upload"
                    className={`flex items-center justify-between w-full p-6 bg-gray-50 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${formData.photo
                        ? 'border-[#144542] bg-[#144542]/5'
                        : 'border-gray-200 hover:border-[#144542] hover:bg-[#144542]/5'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${formData.photo ? 'bg-[#144542] text-[#DAFF0C]' : 'bg-white text-gray-400 border border-gray-100 shadow-sm'
                        }`}>
                        {formData.photo ? <FiCheckCircle className="text-xl" /> : <FiCamera className="text-xl" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#144542]">
                          {formData.photo ? "Photo Uploaded Successfully" : "Click to Upload Photo"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.photo ? formData.photo.name : "SVG, PNG, JPG (max. 5MB)"}
                        </p>
                      </div>
                    </div>
                    <div className="px-5 py-2.5 bg-white text-[#144542] text-xs font-black rounded-xl border border-gray-100 shadow-sm transition-transform active:scale-95 group-hover:shadow-md">
                      {formData.photo ? "Change Photo" : "Choose Photo"}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-12">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-[#144542] text-[#DAFF0C] font-black rounded-2xl hover:opacity-95 shadow-2xl shadow-[#144542]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group uppercase tracking-widest text-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  "Initiating Submission..."
                ) : (
                  <>
                    Submit Profile for Review
                    <FiArrowRight className="text-lg group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default SubmitProfile;
