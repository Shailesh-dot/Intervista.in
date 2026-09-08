import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Import Modular Components
import CompanySidebar from "./components/CompanySidebar";
import CompanyTopBar from "./components/CompanyTopBar";
import CompanySecondarySidebar from "./components/CompanySecondarySidebar";
import AddHRModal from "./components/AddHRModal";
import HRList from "./components/HRList";
import CreateTest from "./CreateTest";
import CompanyProfile from "./components/CompanyProfile";
import TestDashboard from "./components/TestDashboard";
import { FiPlus } from "react-icons/fi";

gsap.registerPlugin(useGSAP);

export default function CompanyDashboard() {
  const [activeTab, setActiveTab] = useState("home");
  const [companyData, setCompanyData] = useState({ companyName: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isHRModalOpen, setIsHRModalOpen] = useState(false);
  const [hrRefreshKey, setHrRefreshKey] = useState(0);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // GSAP Animations
  useGSAP(() => {
    const tl = gsap.timeline();

    tl.fromTo(
      ".sidebar-anim",
      { x: -100, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: "power4.out" }
    )
    .fromTo(
      ".topbar-anim",
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
      "-=0.4"
    )
    .fromTo(
      ".content-anim",
      { x: 20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" },
      "-=0.4"
    );
  }, { scope: containerRef });

  // Fetch Company Profile on Load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const email = localStorage.getItem("companyEmail");
        if (!email) {
          navigate("/company/login");
          return;
        }

        const token = localStorage.getItem("companyToken");
        if (!token) {
          navigate("/company/login");
          return;
        }

        const response = await fetch("/api/company/profile", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Map backend CompanyProfile to UI expectations
          setCompanyData({
            ...data,
            companyName: data.name || data.companyName || ""
          });
        } else {
          console.error("Failed to fetch profile");
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("companyToken");
    localStorage.removeItem("companyEmail");
    localStorage.removeItem("companyId");
    navigate("/company/login");
  };

  const handleCreateTest = () => {
    setSelectedTest(null);
    setIsCreatingTest(true);
  };

  const handleSelectTest = (test) => {
    setIsCreatingTest(false);
    setSelectedTest(test);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#EAF0F0] items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-[#144542] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-screen w-full bg-[#EAF0F0]/50 font-sans overflow-hidden">
      
      {/* 2. Top Bar Component (Full Width) */}
      <CompanyTopBar 
        companyName={companyData.companyName} 
        companyLogo={companyData.logoUrl || companyData.logo} 
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 1. Side Nav Bar Component */}
        <CompanySidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={handleLogout} 
        />

        <div className="flex-1 flex overflow-hidden">
          {/* 3. Secondary Column Component */}
          {activeTab === "home" && (
            <CompanySecondarySidebar 
              onCreateTest={handleCreateTest} 
              isCreatingTest={isCreatingTest} 
              selectedTestId={selectedTest?.testId}
              onSelectTest={handleSelectTest}
            />
          )}

          {/* 4. Main Dashboard Area */}
          {activeTab === "profile" ? (
            <CompanyProfile />
          ) : (
          <div className="content-anim flex-1 p-8 overflow-y-auto bg-[#EAF0F0]/60 relative">
            {activeTab === "hr" ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 mr-2">
                  <button 
                    onClick={() => setIsHRModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#DFFF00] text-[#144542] font-bold rounded-md shadow-sm hover:shadow transition-all group text-sm"
                  >
                    <span className="text-lg leading-none">+</span> Add HR
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("companyToken");
                        if (!token) return;
                        
                        const response = await fetch("/api/company/hr/list", {
                          headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (response.ok) {
                          const data = await response.json();
                          
                          // Generate CSV content
                          const headers = ["S. No.", "Name", "Email", "Phone no", "Department", "Roll"];
                          const csvContent = [
                            headers.join(","),
                            ...data.map((hr, index) => [
                              index + 1,
                              `"${hr.name || ''}"`,
                              `"${hr.email || ''}"`,
                              `"${hr.phoneNumber || ''}"`,
                              `"${hr.department || 'General'}"`,
                              `"${hr.designation || 'HR'}"`
                            ].join(","))
                          ].join("\n");
                          
                          // Trigger Download
                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.setAttribute("href", url);
                          link.setAttribute("download", `HR_Personnel_List_${new Date().toISOString().split('T')[0]}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } else {
                          console.error("Failed to fetch data for Excel download");
                        }
                      } catch (err) {
                        console.error("Error downloading Excel sheet:", err);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-600 font-medium text-sm rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Excel download
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                   <HRList refreshTrigger={hrRefreshKey} />
                </div>
              </div>
            ) : activeTab === "home" && isCreatingTest ? (
               <CreateTest onCancel={() => setIsCreatingTest(false)} />
            ) : activeTab === "home" && selectedTest ? (
               <TestDashboard test={selectedTest} />
            ) : (
              <div className="max-w-5xl mx-auto h-full border-2 border-dashed border-gray-200/50 rounded-3xl flex items-center justify-center">
                 <p className="text-gray-300 font-bold uppercase tracking-[0.2em] text-sm">Dashboard Workspace</p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Add HR Modal */}
      <AddHRModal 
        isOpen={isHRModalOpen} 
        onClose={() => {
          setIsHRModalOpen(false);
          setHrRefreshKey(prev => prev + 1);
        }} 
      />
    </div>
  );
}