import { useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, LogIn } from "lucide-react";

const Login = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/login`, { password });
      toast.success("Login successful!");
      onLoginSuccess(response.data.token);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid="login-card">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access password"
                  className="pl-10"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#0066CC] hover:bg-[#0052A3]"
              disabled={loading || !password}
              data-testid="login-submit-btn"
            >
              {loading ? (
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
            Medirol Vivera Monobloc Service & Maintenance
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
