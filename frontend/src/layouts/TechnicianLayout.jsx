import { useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import axios from "axios";
import { API, clearAuthToken, getSelectedTechnician, setSelectedTechnician } from "@/App";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { LayoutDashboard, CalendarDays, Wrench, LogOut, User } from "lucide-react";
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import TechnicianCalendar from "@/pages/TechnicianCalendar";
import TechnicianServices from "@/pages/TechnicianServices";

const TechnicianLayout = ({ onLogout }) => {
  const { t } = useTranslation();
  const [selectedTechnicianState, setSelectedTechnicianState] = useState(getSelectedTechnician() || "");

  const handleTechnicianChange = (tech) => {
    setSelectedTechnicianState(tech);
    setSelectedTechnician(tech);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {});
    } catch (error) {
      console.error("Logout error:", error);
    }
    clearAuthToken();
    toast.success(t("auth.loginSuccess").replace("successful", "out"));
    onLogout();
  };

  const navItems = [
    { path: "/technician", label: t("navigation.dashboard"), icon: LayoutDashboard },
    { path: "/technician/calendar", label: t("navigation.calendar"), icon: CalendarDays },
    { path: "/technician/services", label: t("navigation.services"), icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Technician Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <img 
                  src="https://customer-assets.emergentagent.com/job_842f69d6-21b8-4f70-96b2-758e2fcffc47/artifacts/3rpmm3ao_Dimeda_logo-01.png" 
                  alt="Dimeda Logo" 
                  className="h-10 w-auto"
                />
                <div>
                  <h1 className="text-lg font-bold text-emerald-600" style={{ fontFamily: 'Manrope, sans-serif' }}>{t("technician.title")}</h1>
                  <p className="text-xs text-slate-500">{t("navigation.services")}</p>
                </div>
              </div>
              
              {/* Navigation Items */}
              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/technician"}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Selected Technician Display */}
              {selectedTechnicianState && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                  <User size={16} className="text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{selectedTechnicianState}</span>
                </div>
              )}
              
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <LogOut size={18} />
                {t("auth.logout")}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<TechnicianDashboard selectedTechnician={selectedTechnicianState} onTechnicianChange={handleTechnicianChange} />} />
          <Route path="/calendar" element={<TechnicianCalendar selectedTechnician={selectedTechnicianState} />} />
          <Route path="/services" element={<TechnicianServices selectedTechnician={selectedTechnicianState} />} />
        </Routes>
      </main>
    </div>
  );
};

export default TechnicianLayout;
