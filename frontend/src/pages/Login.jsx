import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, LogIn, AlertTriangle, Shield, Wrench } from "lucide-react";

const Login = ({ onLoginSuccess, onTechnicianLoginSuccess, onCustomerLoginSuccess }) => {
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
      toast.success("Admin login successful!");
      onLoginSuccess(response.data.token);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid password");
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
      toast.success("Technician login successful!");
      onTechnicianLoginSuccess(response.data.token);
      navigate("/technician");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid password");
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
      toast.success("Customer login successful!");
      onCustomerLoginSuccess(response.data.token);
      navigate("/customer");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid password");
    } finally {
      setCustomerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
        {/* Logo */}
        <div className="mb-4">
          <img 
            src="https://customer-assets.emergentagent.com/job_842f69d6-21b8-4f70-96b2-758e2fcffc47/artifacts/3rpmm3ao_Dimeda_logo-01.png" 
            alt="Dimeda Logo" 
            className="h-16 w-auto"
          />
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
                Full system access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
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
                    "Logging in..."
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      Login as Admin
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
                Technician
              </CardTitle>
              <CardDescription className="text-xs">
                Service & Calendar view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTechnicianLogin} className="space-y-4">
                <div>
                  <Label htmlFor="technician-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      id="technician-password"
                      type="password"
                      value={technicianPassword}
                      onChange={(e) => setTechnicianPassword(e.target.value)}
                      placeholder="Enter technician password"
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
                    "Logging in..."
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      Login as Technician
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
                Customer
              </CardTitle>
              <CardDescription className="text-xs">
                Issue registration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCustomerLogin} className="space-y-4">
                <div>
                  <Label htmlFor="customer-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      id="customer-password"
                      type="password"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="Enter customer password"
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
                    "Logging in..."
                  ) : (
                    <>
                      <LogIn size={18} className="mr-2" />
                      Login as Customer
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <p className="text-xs text-slate-400 text-center mt-4">
          Dimeda Service Pro - Service Partner for Medirol
        </p>
      </div>
    </div>
  );
};

export default Login;
