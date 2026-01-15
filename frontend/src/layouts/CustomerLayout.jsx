import { Routes, Route } from "react-router-dom";
import axios from "axios";
import { API, clearAuthToken } from "@/App";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import { LogOut } from "lucide-react";
import CustomerDashboard from "@/pages/CustomerDashboard";

const CustomerLayout = ({ onLogout }) => {
  const { t } = useTranslation();

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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Customer Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <img 
                  src="https://customer-assets.emergentagent.com/job_842f69d6-21b8-4f70-96b2-758e2fcffc47/artifacts/3rpmm3ao_Dimeda_logo-01.png" 
                  alt="Dimeda Logo" 
                  className="h-10 w-auto"
                />
                <div>
                  <h1 className="text-lg font-bold text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>{t("customer.title")}</h1>
                  <p className="text-xs text-slate-500">{t("customer.reportIssue")}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
          <Route path="/" element={<CustomerDashboard />} />
        </Routes>
      </main>
    </div>
  );
};

export default CustomerLayout;
