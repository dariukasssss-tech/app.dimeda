import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Pages
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Services from "@/pages/Services";
import Issues from "@/pages/Issues";
import Export from "@/pages/Export";
import MaintenanceCalendar from "@/pages/MaintenanceCalendar";
import Login from "@/pages/Login";
import CustomerDashboard from "@/pages/CustomerDashboard";

// Icons
import { LayoutDashboard, Package, Wrench, AlertTriangle, Download, Menu, X, CalendarDays, LogOut } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth token storage keys
const AUTH_TOKEN_KEY = "dimeda_auth_token";
const AUTH_TYPE_KEY = "dimeda_auth_type";

// Configure axios defaults
axios.defaults.withCredentials = true;

// Add auth token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers["X-Auth-Token"] = token;
  }
  return config;
});

// Export auth helper functions
export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
export const getAuthType = () => localStorage.getItem(AUTH_TYPE_KEY);
export const setAuthToken = (token, type = "service") => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_TYPE_KEY, type);
};
export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TYPE_KEY);
};

// Navigation Component
const Navigation = ({ onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/products", label: "Products", icon: Package },
    { path: "/calendar", label: "Calendar", icon: CalendarDays },
    { path: "/services", label: "Services", icon: Wrench },
    { path: "/issues", label: "Issues", icon: AlertTriangle },
    { path: "/export", label: "Export", icon: Download },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {});
    } catch (error) {
      console.error("Logout error:", error);
    }
    clearAuthToken();
    toast.success("Logged out successfully");
    onLogout();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="main-navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_842f69d6-21b8-4f70-96b2-758e2fcffc47/artifacts/3rpmm3ao_Dimeda_logo-01.png" 
                alt="Dimeda Logo" 
                className="h-10 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>Dimeda Service Pro</h1>
                <p className="text-xs text-slate-500">Medirol service partner</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#0066CC] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all ml-2"
              data-testid="logout-btn"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white" data-testid="mobile-menu">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#0066CC] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
              data-testid="mobile-logout-btn"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

// Protected Route wrapper
const ProtectedRoutes = ({ isAuthenticated, onLogout }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation onLogout={onLogout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/calendar" element={<MaintenanceCalendar />} />
          <Route path="/services" element={<Services />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </main>
    </div>
  );
};

// Customer Portal wrapper
const CustomerPortal = ({ onLogout }) => {
  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {});
    } catch (error) {
      console.error("Logout error:", error);
    }
    clearAuthToken();
    toast.success("Logged out successfully");
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
                  <h1 className="text-lg font-bold text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>Dimeda Customer Pro</h1>
                  <p className="text-xs text-slate-500">Issue Registration</p>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <LogOut size={18} />
                Logout
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState(null); // "service" or "customer"
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getAuthToken();
    const storedType = getAuthType();
    
    if (!token) {
      setIsAuthenticated(false);
      setAuthType(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/check`);
      setIsAuthenticated(response.data.authenticated);
      setAuthType(response.data.type || storedType);
      if (!response.data.authenticated) {
        clearAuthToken();
        setAuthType(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setAuthType(null);
      clearAuthToken();
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceLoginSuccess = (token) => {
    setAuthToken(token, "service");
    setIsAuthenticated(true);
    setAuthType("service");
  };

  const handleCustomerLoginSuccess = (token) => {
    setAuthToken(token, "customer");
    setIsAuthenticated(true);
    setAuthType("customer");
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setAuthType(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              authType === "customer" ? (
                <Navigate to="/customer" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Login 
                onLoginSuccess={handleServiceLoginSuccess} 
                onCustomerLoginSuccess={handleCustomerLoginSuccess}
              />
            )
          } 
        />
        {/* Customer Portal Routes */}
        <Route 
          path="/customer/*" 
          element={
            isAuthenticated && authType === "customer" ? (
              <CustomerPortal onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        {/* Service Pro Routes */}
        <Route 
          path="/*" 
          element={
            isAuthenticated && authType === "service" ? (
              <ProtectedRoutes 
                isAuthenticated={isAuthenticated} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
