import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiPhone, FiBriefcase, FiLayers, FiMoreVertical, FiTrash2 } from "react-icons/fi";

export default function HRList({ refreshTrigger }) {
  const [hrList, setHrList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHRList = async () => {
      const companyId = localStorage.getItem("companyId");
      if (!companyId) return;

      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("companyToken");
        const response = await fetch("/api/company/hr/list", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setHrList(data);
        } else {
          const errorMsg = await response.text();
          console.error("Failed to fetch HR list:", errorMsg);
          setError("Failed to load HR data");
        }
      } catch (err) {
        console.error("Error connecting to mail server proxy:", err);
        setError("Network error. Is the mail server running?");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHRList();
  }, [refreshTrigger]);

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleDelete = async (hrId) => {
    if (!window.confirm("Are you sure you want to delete this HR?")) return;

    try {
      const token = localStorage.getItem("companyToken");
      const response = await fetch(`/api/company/hr/delete/${hrId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        // Refresh the list
        setHrList(hrList.filter(hr => (hr.hrId || hr.id) !== hrId));
      } else {
        const errorMsg = await response.text();
        alert("Failed to delete HR: " + errorMsg);
      }
    } catch (err) {
      console.error("Error deleting HR:", err);
      alert("Network error. Could not delete HR.");
    }
  };

  return (
    <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-100/50 overflow-hidden min-h-[500px]">
      {/* Header Row */}
      <div className="px-8 py-4 flex items-center bg-[#F9FAFB] text-gray-500 text-sm font-semibold border-b border-gray-100">
        <div className="w-20 pl-0">S. No.</div>
        <div className="flex-[1.5]">Name</div>
        <div className="flex-[2]">Email</div>
        <div className="flex-1">Phone no</div>
        <div className="flex-1">Department</div>
        <div className="w-32">Roll</div>
        <div className="w-16">Action</div>
      </div>

      <div className="flex flex-col">
        {isLoading ? (
           <div className="p-8 flex flex-col gap-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="h-10 bg-gray-50 animate-pulse rounded-md" />
             ))}
           </div>
        ) : error ? (
           <div className="p-12 text-center text-red-500">
             <p className="font-semibold">{error}</p>
           </div>
        ) : hrList.length === 0 ? (
           <div className="p-12 text-center text-gray-400">
             {/* Empty space matching the image */}
           </div>
        ) : (
          <AnimatePresence>
            {hrList.map((hr, index) => (
              <motion.div
                key={hr.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="px-8 py-5 flex items-center text-gray-700 text-sm border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                {/* S. No. Column */}
                <div className="w-20 pl-2 font-medium text-gray-400">
                  {(index + 1).toString().padStart(2, '0')}
                </div>

                {/* Name Column */}
                <div className="flex-[1.5] font-semibold text-gray-900">
                  {hr.name}
                </div>

                {/* Email Column */}
                <div className="flex-[2] truncate pr-4 text-gray-500">
                  {hr.email}
                </div>

                {/* Phone Column */}
                <div className="flex-1 text-gray-500">
                  {hr.phoneNumber}
                </div>

                {/* Department Column */}
                <div className="flex-1 text-gray-500 capitalize">
                  {hr.department || "General"}
                </div>

                <div className="w-32 text-gray-600">
                  {hr.designation || "HR"}
                </div>

                {/* Action Column */}
                <div className="w-16 flex justify-center">
                  <button
                    onClick={() => handleDelete(hr.hrId || hr.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete HR"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
