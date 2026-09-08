import React from "react";
import { FiHome, FiCreditCard, FiLogOut, FiUsers, FiUser } from "react-icons/fi";

export default function CompanySidebar({ activeTab, setActiveTab, onLogout }) {
  const navItems = [
    { id: "home",    icon: <FiHome />,       label: "Home"    },
    { id: "billing", icon: <FiCreditCard />,  label: "Billing" },
    { id: "hr",      icon: <FiUsers />,       label: "HR"      },
  ];

  const NavBtn = ({ id, icon, label }) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className="group flex flex-col items-center gap-1 transition-all"
    >
      <div
        className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
          activeTab === id
            ? "bg-[#144542] text-white shadow-lg"
            : "text-[#144542]/60 hover:text-[#144542] hover:bg-gray-50"
        }`}
      >
        <span className="text-2xl">{icon}</span>
        <span
          className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${
            activeTab === id ? "text-white" : "text-[#144542]/60"
          }`}
        >
          {label}
        </span>
      </div>
    </button>
  );

  return (
    <div className="sidebar-anim w-24 bg-white flex flex-col py-8 pt-6 items-center justify-between border-r border-gray-200 relative z-20">
      {/* Top Nav */}
      <div className="flex flex-col gap-6 w-full items-center">
        {navItems.map((item) => (
          <NavBtn key={item.id} {...item} />
        ))}
      </div>

      {/* Bottom: Profile + Logout */}
      <div className="flex flex-col items-center gap-4">
        {/* Profile Button */}
        <button
          onClick={() => setActiveTab("profile")}
          className="group flex flex-col items-center gap-1 transition-all"
        >
          <div
            className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
              activeTab === "profile"
                ? "bg-[#144542] text-white shadow-lg"
                : "text-[#144542]/60 hover:text-[#144542] hover:bg-gray-50"
            }`}
          >
            <span className="text-2xl"><FiUser /></span>
            <span
              className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${
                activeTab === "profile" ? "text-white" : "text-[#144542]/60"
              }`}
            >
              Profile
            </span>
          </div>
        </button>

        {/* Divider */}
        <div className="w-8 h-px bg-gray-200" />

        {/* Logout */}
        <button
          onClick={onLogout}
          className="group flex flex-col items-center gap-1 transition-all"
        >
          <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center text-[#144542]/60 hover:text-red-500 hover:bg-red-50 transition-all duration-300">
            <span className="text-2xl"><FiLogOut /></span>
            <span className="text-[10px] font-bold uppercase tracking-tight mt-1">
              Logout
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
