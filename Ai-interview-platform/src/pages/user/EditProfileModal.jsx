import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCamera, FiCheckCircle } from "react-icons/fi";
import axios from "axios";

const profileApi = axios.create({
  baseURL: "/api/user",
  headers: { "Content-Type": "application/json" },
});

profileApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const EditProfileModal = ({ isOpen, onClose, userData, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [formData, setFormData] = useState({
    name: userData.name || "",
    email: userData.email || "",
    dob: userData.dob || "",
    age: userData.age || "",
    college: userData.college || "",
    address: userData.address || "",
    phone: userData.phone || "",
    gender: userData.gender || "",
    photo: null,
  });

  // Clear message when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMessage({ text: "", type: "" });
    }
  }, [isOpen]);

  // Sync with userData when it changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        dob: userData.dob || "",
        age: userData.age || "",
        college: userData.college || "",
        address: userData.address || "",
        phone: userData.phone || "",
        gender: userData.gender || "",
        photo: null,
      });
    }
  }, [isOpen, userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("authToken");

      if (!userId || !token) {
        setMessage({ text: "Session expired. Please login again.", type: "error" });
        return;
      }

      // Step 1: Upload photo if selected
      let photoUrl = userData.photoUrl || "";
      if (formData.photo) {
        const photoFormData = new FormData();
        photoFormData.append("photo", formData.photo);

        const photoResponse = await profileApi.post("/profile/upload-photo", photoFormData, {
          headers: { 
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          },
        });

        photoUrl = photoResponse.data.photoUrl || "";
      }

      // Step 2: Create/save the profile
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

      await profileApi.post("/profile/create", submissionData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
      });

      setMessage({ text: "Profile updated successfully!", type: "success" });

      const updatedData = {
        ...formData,
        photoUrl
      };
      delete updatedData.photo;

      onSave(updatedData);
      
      // Delay closing to show the success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error saving profile:", error);
      let errorMsg = "Failed to save profile";

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
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
          >
            {/* Header */}
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-2xl font-black text-[#144542] tracking-tight">Edit Profile</h2>
                <p className="text-gray-500 text-sm mt-1 font-medium">Keep your account details up to date</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-100 transition-all duration-300"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Animated Message Banner */}
            <AnimatePresence>
              {message.text && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 md:px-8 pt-4 pb-0"
                >
                  <div className={`p-4 rounded-xl font-bold text-sm flex items-center gap-3 ${
                    message.type === "success" 
                      ? "bg-green-100 text-green-800 border border-green-200" 
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${message.type === "success" ? "bg-green-600" : "bg-red-600"}`}></div>
                    {message.text}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto custom-scrollbar grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                    placeholder="Enter your name"
                    required
                  />
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-5 py-3.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm font-medium cursor-not-allowed italic"
                  />
                </div>

                {/* DOB */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                  />
                </div>

                {/* Age */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                    placeholder="Age"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium appearance-none"
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
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    College / Institution
                  </label>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                    placeholder="Engineering College Name"
                  />
                </div>

                {/* Phone */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    Detailed Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#144542]/5 focus:border-[#144542] transition-all text-sm font-medium resize-none"
                    placeholder="Your complete address..."
                  ></textarea>
                </div>

                {/* Profile Photo Upload */}
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-sm font-bold text-[#144542] ml-1">
                    Profile Photo
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      id="photo-upload"
                      name="photo"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    <label
                      htmlFor="photo-upload"
                      className={`flex items-center justify-between w-full px-5 py-4 bg-gray-50 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${formData.photo
                          ? 'border-[#144542] bg-[#144542]/5'
                          : 'border-gray-200 hover:border-[#144542] hover:bg-gray-100/50'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${formData.photo ? 'bg-[#144542] text-[#DAFF0C]' : 'bg-white text-gray-400 border border-gray-100'
                          }`}>
                          {formData.photo ? <FiCheckCircle className="text-xl" /> : <FiCamera className="text-xl" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#144542]">
                            {formData.photo ? 'Photo Selected' : 'Choose Profile Picture'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formData.photo ? formData.photo.name : 'SVG, PNG, JPG or GIF (max. 5MB)'}
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-white text-[#144542] text-xs font-black rounded-lg border border-gray-100 shadow-sm group-hover:scale-105 transition-transform">
                        {formData.photo ? 'Change' : 'Browse'}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer Actions */}
            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-4 px-6 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-[2] py-4 px-6 bg-[#144542] text-[#DAFF0C] font-black rounded-2xl hover:opacity-95 shadow-xl shadow-[#144542]/20 transition-all active:scale-95 uppercase tracking-widest text-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Apply Changes"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditProfileModal;
