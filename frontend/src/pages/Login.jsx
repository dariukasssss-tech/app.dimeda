import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, LogIn, AlertTriangle, Shield, Wrench } from "lucide-react";

const Login = ({ onLoginSuccess, onTechnicianLoginSuccess, onCustomerLoginSuccess }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [adminPassword, setAdminPassword] = useState("");
  const [technicianPassword, setTechnicianPassword] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [technicianLoading, setTechnicianLoading] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Admin login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/login`, { password: adminPassword });
      toast.success(t("auth.loginSuccess"));
      onLoginSuccess(response.data.token);
    } catch (error) {
      toast.error(error.response?.data?.detail || t("auth.loginFailed"));
    } finally {
      setAdminLoading(false);
    }
  };

  // Technician login
  const handleTechnicianLogin = async (e) => {
    e.preventDefault();
    setTechnicianLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/technician-login`, { password: technicianPassword });
      toast.success(t("auth.loginSuccess"));
      onTechnicianLoginSuccess(response.data.token);
      navigate("/technician");
    } catch (error) {
      toast.error(error.response?.data?.detail || t("auth.loginFailed"));
    } finally {
      setTechnicianLoading(false);
    }
  };

  // Customer Pro login
  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setCustomerLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/customer-login`, { password: customerPassword });
      toast.success(t("auth.loginSuccess"));
      onCustomerLoginSuccess(response.data.token);
      navigate("/customer");
    } catch (error) {
      toast.error(error.response?.data?.detail || t("auth.loginFailed"));
    } finally {
      setCustomerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
        {/* Logo and Language Switcher */}
        <div className="flex items-center justify-between w-full mb-4">
          <img 
            src="https://customer-assets.emergentagent.com/job_842f69d6-21b8-4f70-96b2-758e2fcffc47/artifacts/3rpmm3ao_Dimeda_logo-01.png" 
            alt="Dimeda Logo" 
            className="h-16 w-auto"
          />
          <LanguageSwitcher />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Admin Login */}
          <Card className="flex-1" data-testid="admin-login-card">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Shield size={24} className="text-[#0066CC]" />
                </div>
              </div>
              <CardTitle className="text-xl text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Admin
              </CardTitle>
              <CardDescription className="text-xs">
                {t("auth.adminLogin")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-password">{t("auth.password")}</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder={t("auth.adminPassword")}
                      className="pl-10"
                      required
                      data-testid="admin-password-input"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#0066CC] hover:bg-[#0052A3]"
                  disabled={adminLoading || !adminPassword}
                  data-testid="admin-login-btn"
                >
                  {adminLoading ? (
                    t("common.loading")
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      {t("auth.adminLogin")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Technician Login */}
          <Card className="flex-1" data-testid="technician-login-card">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Wrench size={24} className="text-emerald-600" />
                </div>
              </div>
              <CardTitle className="text-xl text-emerald-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {t("technician.technician")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("auth.technicianLogin")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTechnicianLogin} className="space-y-4">
                <div>
                  <Label htmlFor="technician-password">{t("auth.password")}</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      id="technician-password"
                      type="password"
                      value={technicianPassword}
                      onChange={(e) => setTechnicianPassword(e.target.value)}
                      placeholder={t("auth.technicianPassword")}
                      className="pl-10"
                      required
                      data-testid="technician-password-input"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={technicianLoading || !technicianPassword}
                  data-testid="technician-login-btn"
                >
                  {technicianLoading ? (
                    t("common.loading")
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      {t("auth.technicianLogin")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Customer Pro Login */}
          <Card className="flex-1" data-testid="customer-login-card">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-amber-600" />
                </div>
              </div>
              <CardTitle className="text-xl text-amber-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {t("customer.title").replace(" Portal", "")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("auth.customerLogin")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCustomerLogin} className="space-y-4">
                <div>
                  <Label htmlFor="customer-password">{t("auth.password")}</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      id="customer-password"
                      type="password"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder={t("auth.customerPassword")}
                      className="pl-10"
                      required
                      data-testid="customer-password-input"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  disabled={customerLoading || !customerPassword}
                  data-testid="customer-login-btn"
                >
                  {customerLoading ? (
                    t("common.loading")
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      {t("auth.customerLogin")}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <p className="text-xs text-slate-400 text-center mt-4">
          {t("common.appName")} - Medirol Service Partner
        </p>
      </div>
    </div>
  );
};

export default Login;
