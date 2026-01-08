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
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import TechnicianCalendar from "@/pages/TechnicianCalendar";
import TechnicianServices from "@/pages/TechnicianServices";

// Icons
import { LayoutDashboard, Package, Wrench, AlertTriangle, Download, Menu, X, CalendarDays, LogOut, Bell, User } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth token storage keys
const AUTH_TOKEN_KEY = "dimeda_auth_token";
const AUTH_TYPE_KEY = "dimeda_auth_type";
const SELECTED_TECHNICIAN_KEY = "dimeda_selected_technician";

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
export const setAuthToken = (token, type = "admin") => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_TYPE_KEY, type);
};
export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TYPE_KEY);
  localStorage.removeItem(SELECTED_TECHNICIAN_KEY);
};
export const getSelectedTechnician = () => localStorage.getItem(SELECTED_TECHNICIAN_KEY);
export const setSelectedTechnician = (tech) => localStorage.setItem(SELECTED_TECHNICIAN_KEY, tech);

// Navigation Component
const Navigation = ({ onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [customerIssues, setCustomerIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/products", label: "Products", icon: Package },
    { path: "/calendar", label: "Calendar", icon: CalendarDays },
    { path: "/services", label: "Services", icon: Wrench },
    { path: "/issues", label: "Issues", icon: AlertTriangle },
    { path: "/export", label: "Export", icon: Download },
  ];

  // Fetch customer-reported issues without technician assigned
  const fetchNotifications = async () => {
    try {
      const [issuesRes, productsRes] = await Promise.all([
        axios.get(`${API}/issues`),
        axios.get(`${API}/products`)
      ]);
      // Filter for customer issues without technician assigned
      const unassignedCustomerIssues = issuesRes.data.filter(
        issue => issue.source === "customer" && !issue.technician_name && issue.status !== "resolved"
      );
      setCustomerIssues(unassignedCustomerIssues);
      setProducts(productsRes.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const getProductSerial = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const getProductCity = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.city || "Unknown";
  };

  // OPTIMIZATION 4: Calculate SLA time remaining for notification urgency
  const calculateSLARemaining = (issue) => {
    const createdAt = new Date(issue.created_at);
    const slaDeadline = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = slaDeadline - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: "EXPIRED", urgency: "critical" };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let urgency = "normal";
    if (hours < 2) urgency = "critical";
    else if (hours < 6) urgency = "warning";
    
    if (hours > 0) {
      return { expired: false, text: `${hours}h ${minutes}m`, urgency };
    }
    return { expired: false, text: `${minutes}m`, urgency };
  };

  const handleNotificationClick = (issueId) => {
    setNotificationOpen(false);
    navigate(`/issues?status=open`);
  };

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
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 transition-all ml-2"
                data-testid="notification-bell"
              >
                <Bell size={20} />
                {customerIssues.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {customerIssues.length > 9 ? "9+" : customerIssues.length}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50" data-testid="notification-dropdown">
                  <div className="p-3 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Customer Issues
                    </h3>
                    <p className="text-xs text-slate-500">
                      {customerIssues.length} unassigned issue{customerIssues.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {customerIssues.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        No unassigned customer issues
                      </div>
                    ) : (
                      customerIssues.map((issue) => {
                        const sla = calculateSLARemaining(issue);
                        return (
                        <div
                          key={issue.id}
                          className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                            sla.urgency === "critical" ? "bg-red-50" : 
                            sla.urgency === "warning" ? "bg-orange-50" : ""
                          }`}
                          onClick={() => handleNotificationClick(issue.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {issue.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                S/N: {getProductSerial(issue.product_id)} • {getProductCity(issue.product_id)}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                  sla.urgency === "critical" ? "bg-red-500 text-white" :
                                  sla.urgency === "warning" ? "bg-orange-500 text-white" :
                                  "bg-amber-100 text-amber-800"
                                }`}>
                                  SLA: {sla.text}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(issue.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                              {issue.severity}
                            </span>
                          </div>
                        </div>
                      )})
                    )}
                  </div>
                  {customerIssues.length > 0 && (
                    <div className="p-2 border-t border-slate-200">
                      <button
                        onClick={() => {
                          setNotificationOpen(false);
                          navigate('/issues?status=open');
                        }}
                        className="w-full text-center text-sm text-[#0066CC] hover:text-[#0052A3] font-medium py-2"
                      >
                        View all issues
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
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

// Technician Portal wrapper
const TechnicianPortal = ({ onLogout }) => {
  const [selectedTechnician, setSelectedTechnicianState] = useState(getSelectedTechnician() || "");
  const location = useLocation();

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
    toast.success("Logged out successfully");
    onLogout();
  };

  const navItems = [
    { path: "/technician", label: "Dashboard", icon: LayoutDashboard },
    { path: "/technician/calendar", label: "Calendar", icon: CalendarDays },
    { path: "/technician/services", label: "Services", icon: Wrench },
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
                  <h1 className="text-lg font-bold text-emerald-600" style={{ fontFamily: 'Manrope, sans-serif' }}>Dimeda Technician</h1>
                  <p className="text-xs text-slate-500">Service View</p>
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
              {selectedTechnician && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                  <User size={16} className="text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{selectedTechnician}</span>
                </div>
              )}
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
          <Route path="/" element={<TechnicianDashboard selectedTechnician={selectedTechnician} onTechnicianChange={handleTechnicianChange} />} />
          <Route path="/calendar" element={<TechnicianCalendar selectedTechnician={selectedTechnician} />} />
          <Route path="/services" element={<TechnicianServices selectedTechnician={selectedTechnician} />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState(null); // "admin", "technician", or "customer"
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

  const handleAdminLoginSuccess = (token) => {
    setAuthToken(token, "admin");
    setIsAuthenticated(true);
    setAuthType("admin");
  };

  const handleTechnicianLoginSuccess = (token) => {
    setAuthToken(token, "technician");
    setIsAuthenticated(true);
    setAuthType("technician");
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
              ) : authType === "technician" ? (
                <Navigate to="/technician" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Login 
                onLoginSuccess={handleAdminLoginSuccess}
                onTechnicianLoginSuccess={handleTechnicianLoginSuccess}
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
        {/* Technician Portal Routes */}
        <Route 
          path="/technician/*" 
          element={
            isAuthenticated && authType === "technician" ? (
              <TechnicianPortal onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        {/* Admin/Service Pro Routes */}
        <Route 
          path="/*" 
          element={
            isAuthenticated && authType === "admin" ? (
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
