import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, LogIn, AlertTriangle } from "lucide-react";

const Login = ({ onLoginSuccess, onCustomerLoginSuccess }) => {
  const navigate = useNavigate();
  const [servicePassword, setServicePassword] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [serviceLoading, setServiceLoading] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Service Pro login
  const handleServiceLogin = async (e) => {
    e.preventDefault();
    setServiceLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/login`, { password: servicePassword });
      toast.success("Login successful!");
      onLoginSuccess(response.data.token);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid password");
    } finally {
      setServiceLoading(false);
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
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-4xl">
        {/* Service Pro Login */}
        <Card className="flex-1" data-testid="service-login-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_842f69d6-21b8-4f70-96b2-758e2fcffc47/artifacts/3rpmm3ao_Dimeda_logo-01.png" 
                alt="Dimeda Logo" 
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-2xl text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Dimeda Service Pro
            </CardTitle>
            <CardDescription>
              Enter password to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleServiceLogin} className="space-y-4">
              <div>
                <Label htmlFor="service-password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input
                    id="service-password"
                    type="password"
                    value={servicePassword}
                    onChange={(e) => setServicePassword(e.target.value)}
                    placeholder="Enter access password"
                    className="pl-10"
                    required
                    data-testid="service-password-input"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#0066CC] hover:bg-[#0052A3]"
                disabled={serviceLoading || !servicePassword}
                data-testid="service-login-btn"
              >
                {serviceLoading ? (
                  "Logging in..."
                ) : (
                  <>
                    <LogIn size={18} className="mr-2" />
                    Login
                  </>
                )}
              </Button>
            </form>
            <p className="text-xs text-slate-400 text-center mt-6">
              Service & Maintenance
            </p>
          </CardContent>
        </Card>

        {/* Customer Pro Login */}
        <Card className="flex-1" data-testid="customer-login-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_842f69d6-21b8-4f70-96b2-758e2fcffc47/artifacts/3rpmm3ao_Dimeda_logo-01.png" 
                alt="Dimeda Logo" 
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-2xl text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Dimeda Customer Pro
            </CardTitle>
            <CardDescription>
              Enter password to access the system
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
                className="w-full bg-[#0066CC] hover:bg-[#0052A3]"
                disabled={customerLoading || !customerPassword}
                data-testid="customer-login-btn"
              >
                {customerLoading ? (
                  "Logging in..."
                ) : (
                  <>
                    <LogIn size={18} className="mr-2" />
                    Login
                  </>
                )}
              </Button>
            </form>
            <p className="text-xs text-slate-500 text-center mt-6 flex items-center justify-center gap-1">
              <AlertTriangle size={14} className="text-amber-500" />
              Issue registration
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
