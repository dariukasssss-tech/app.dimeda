import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, clearAuthToken } from "@/App";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, Package, Wrench, AlertTriangle, Download, Menu, X, CalendarDays, LogOut, Bell, MoreVertical, Users, UserPlus } from "lucide-react";

const CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"];

const Navigation = ({ onLogout }) => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [customerIssues, setCustomerIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    city: "",
    address: "",
    contact_person: "",
    phone: "",
    email: "",
  });
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/", label: t("navigation.dashboard"), icon: LayoutDashboard },
    { path: "/products", label: t("navigation.products"), icon: Package },
    { path: "/calendar", label: t("navigation.calendar"), icon: CalendarDays },
    { path: "/services", label: t("navigation.services"), icon: Wrench },
    { path: "/issues", label: t("navigation.issues"), icon: AlertTriangle },
    { path: "/export", label: t("navigation.reports"), icon: Download },
  ];

  const resetCustomerForm = () => {
    setCustomerFormData({
      name: "",
      city: "",
      address: "",
      contact_person: "",
      phone: "",
      email: "",
    });
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/customers`, customerFormData);
      toast.success(t("customers.customerCreated") || "Customer added successfully");
      setAddCustomerOpen(false);
      resetCustomerForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("common.error"));
    }
  };

  const fetchNotifications = async () => {
    try {
      const [issuesRes, productsRes] = await Promise.all([
        axios.get(`${API}/issues`),
        axios.get(`${API}/products`)
      ]);
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
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const getProductSerial = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.serial_number || t("common.noData");
  };

  const getProductCity = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.city || t("common.noData");
  };

  const calculateSLARemaining = (issue) => {
    const createdAt = new Date(issue.created_at);
    const slaDeadline = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = slaDeadline - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: t("time.slaExpired"), urgency: "critical" };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let urgency = "normal";
    if (hours < 2) urgency = "critical";
    else if (hours < 6) urgency = "warning";
    
    if (hours > 0) {
      return { expired: false, text: t("time.hoursLeft", { hours, minutes }), urgency };
    }
    return { expired: false, text: t("time.minutesLeft", { minutes }), urgency };
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
    toast.success(t("auth.loginSuccess").replace("successful", "out"));
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
                <h1 className="text-lg font-bold text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>{t("common.appName")}</h1>
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
                data-testid={`nav-${item.path === "/" ? "dashboard" : item.path.slice(1)}`}
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
                      {t("customer.myIssues")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {customerIssues.length} {t("issues.noIssues").replace("No issues found", "unassigned issue(s)")}
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {customerIssues.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        {t("issues.noIssues")}
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
                        {t("issues.title")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 3-Dot Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 transition-all ml-2"
                  data-testid="more-menu-btn"
                >
                  <MoreVertical size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => navigate('/customers')}
                  className="cursor-pointer"
                  data-testid="menu-customers"
                >
                  <Users size={16} className="mr-2" />
                  {t("customers.title") || "Customers"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setAddCustomerOpen(true)}
                  className="cursor-pointer"
                  data-testid="menu-add-customer"
                >
                  <UserPlus size={16} className="mr-2" />
                  {t("customers.addCustomer") || "Add Customer"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all ml-2"
              data-testid="logout-btn"
            >
              <LogOut size={18} />
              {t("auth.logout")}
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
                data-testid={`mobile-nav-${item.path === "/" ? "dashboard" : item.path.slice(1)}`}
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
            {/* Mobile menu items for customers */}
            <button
              onClick={() => { setMobileMenuOpen(false); navigate('/customers'); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 w-full"
            >
              <Users size={20} />
              {t("customers.title") || "Customers"}
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); setAddCustomerOpen(true); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 w-full"
            >
              <UserPlus size={20} />
              {t("customers.addCustomer") || "Add Customer"}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
              data-testid="mobile-logout-btn"
            >
              <LogOut size={20} />
              {t("auth.logout")}
            </button>
          </div>
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={addCustomerOpen} onOpenChange={(open) => {
        setAddCustomerOpen(open);
        if (!open) resetCustomerForm();
      }}>
        <DialogContent className="max-w-lg" data-testid="add-customer-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {t("customers.addCustomer") || "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="nav-customer-name">{t("customers.name") || "Name"} *</Label>
              <Input
                id="nav-customer-name"
                value={customerFormData.name}
                onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                placeholder={t("customers.companyName") || "Company or institution name"}
                required
                className="mt-1"
                data-testid="nav-input-customer-name"
              />
            </div>
            
            <div>
              <Label>{t("products.city") || "City"} *</Label>
              <Select
                value={customerFormData.city}
                onValueChange={(value) => setCustomerFormData({ ...customerFormData, city: value })}
              >
                <SelectTrigger className="mt-1" data-testid="nav-select-customer-city">
                  <SelectValue placeholder={t("products.city") || "Select city"} />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nav-customer-address">{t("customers.address") || "Address"}</Label>
              <Input
                id="nav-customer-address"
                value={customerFormData.address}
                onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                placeholder={t("customers.fullAddress") || "Full address"}
                className="mt-1"
                data-testid="nav-input-customer-address"
              />
            </div>

            <div>
              <Label htmlFor="nav-contact-person">{t("customers.contactPerson") || "Contact Person"}</Label>
              <Input
                id="nav-contact-person"
                value={customerFormData.contact_person}
                onChange={(e) => setCustomerFormData({ ...customerFormData, contact_person: e.target.value })}
                placeholder={t("customers.contactPersonName") || "Contact person name"}
                className="mt-1"
                data-testid="nav-input-contact-person"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nav-customer-phone">{t("customers.phone") || "Phone"}</Label>
                <Input
                  id="nav-customer-phone"
                  type="tel"
                  value={customerFormData.phone}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                  placeholder="+370..."
                  className="mt-1"
                  data-testid="nav-input-customer-phone"
                />
              </div>
              <div>
                <Label htmlFor="nav-customer-email">{t("customers.email") || "Email"}</Label>
                <Input
                  id="nav-customer-email"
                  type="email"
                  value={customerFormData.email}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-1"
                  data-testid="nav-input-customer-email"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setAddCustomerOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button 
                type="submit" 
                className="bg-[#0066CC] hover:bg-[#0052A3]"
                disabled={!customerFormData.name || !customerFormData.city}
                data-testid="nav-submit-customer-btn"
              >
                {t("customers.addCustomer") || "Add Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navigation;
