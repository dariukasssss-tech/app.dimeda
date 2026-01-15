import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  AlertTriangle,
  Trash2,
  Building2,
  Timer,
  Users,
  User,
  X,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isBefore, parseISO } from "date-fns";

// OPTIMIZATION 5: Technician list for "My Tasks" filter
const TECHNICIANS = ["Technician 1", "Technician 2", "Technician 3"];

const MaintenanceCalendar = () => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [upcomingCount, setUpcomingCount] = useState({ upcoming: 0, overdue: 0 });
  const [cityFilter, setCityFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all"); // OPTIMIZATION 5: My Tasks filter
  // Stats popup state
  const [statsPopupOpen, setStatsPopupOpen] = useState(false);
  const [statsPopupType, setStatsPopupType] = useState(null);
  const [statsPopupData, setStatsPopupData] = useState([]);
  const [statsPopupLoading, setStatsPopupLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    scheduled_date: "",
    maintenance_type: "",
    technician_name: "",
    notes: "",
  });

  const CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"];

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      
      const [maintenanceRes, productsRes, countRes, issuesRes, servicesRes] = await Promise.all([
        axios.get(`${API}/scheduled-maintenance?year=${year}&month=${month}`),
        axios.get(`${API}/products`),
        axios.get(`${API}/scheduled-maintenance/upcoming/count`),
        axios.get(`${API}/issues`),
        axios.get(`${API}/services`),
      ]);
      
      setMaintenanceItems(maintenanceRes.data);
      setProducts(productsRes.data);
      setUpcomingCount(countRes.data);
      setIssues(issuesRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats popup data
  const openStatsPopup = async (type) => {
    setStatsPopupType(type);
    setStatsPopupLoading(true);
    setStatsPopupOpen(true);
    
    try {
      let endpoint = "";
      if (type === "upcoming") endpoint = "/scheduled-maintenance/upcoming/list";
      else if (type === "overdue") endpoint = "/scheduled-maintenance/overdue/list";
      else if (type === "this-month") endpoint = "/scheduled-maintenance/this-month/list";
      
      const response = await axios.get(`${API}${endpoint}`);
      setStatsPopupData(response.data);
    } catch (error) {
      toast.error("Failed to fetch data");
      setStatsPopupData([]);
    } finally {
      setStatsPopupLoading(false);
    }
  };

  const getStatsPopupTitle = () => {
    switch(statsPopupType) {
      case "upcoming": return "Upcoming Maintenance (30 days)";
      case "overdue": return "Overdue Maintenance";
      case "this-month": return "This Month's Maintenance";
      default: return "Maintenance";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/scheduled-maintenance/${selectedItem.id}`, formData);
        toast.success("Maintenance updated successfully");
      } else {
        await axios.post(`${API}/scheduled-maintenance`, formData);
        toast.success("Maintenance scheduled successfully");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save maintenance");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API}/scheduled-maintenance/${id}`, { status: newStatus });
      toast.success(`Maintenance marked as ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this scheduled maintenance?")) return;
    try {
      await axios.delete(`${API}/scheduled-maintenance/${id}`);
      toast.success("Maintenance deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete maintenance");
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      scheduled_date: "",
      maintenance_type: "",
      technician_name: "",
      notes: "",
    });
    setSelectedItem(null);
    setSelectedDate(null);
  };

  const openNewMaintenanceDialog = (date = null) => {
    resetForm();
    if (date) {
      setFormData((prev) => ({
        ...prev,
        scheduled_date: format(date, "yyyy-MM-dd"),
      }));
      setSelectedDate(date);
    }
    setDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setSelectedItem(item);
    setFormData({
      product_id: item.product_id,
      scheduled_date: item.scheduled_date,
      maintenance_type: item.maintenance_type,
      technician_name: item.technician_name || "",
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const getProductSerial = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const getMaintenanceForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filteredMaintenance.filter((item) => item.scheduled_date.startsWith(dateStr));
  };

  // Filter maintenance by city
  const getProductCity = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.city || "";
  };

  // Apply both city and technician filters
  const filteredMaintenance = maintenanceItems.filter((item) => {
    const cityMatch = cityFilter === "all" || getProductCity(item.product_id) === cityFilter;
    let techMatch = true;
    if (technicianFilter === "all") {
      techMatch = true;
    } else if (technicianFilter === "unassigned") {
      techMatch = !item.technician_name;
    } else {
      techMatch = item.technician_name === technicianFilter;
    }
    return cityMatch && techMatch;
  });

  // Calculate statistics by technician (includes maintenance, issues, and services)
  const getTechnicianStats = (techName) => {
    // Maintenance items for this technician
    const techMaintenance = maintenanceItems.filter(item => item.technician_name === techName);
    
    // Issues assigned to this technician
    const techIssues = issues.filter(issue => issue.technician_name === techName);
    
    // Services done by this technician
    const techServices = services.filter(service => service.technician_name === techName);
    
    return {
      // Maintenance stats
      yearly: techMaintenance.filter(item => item.source === "auto_yearly" || item.maintenance_type === "routine").length,
      issue12h: techMaintenance.filter(item => item.priority === "12h").length,
      issue24h: techMaintenance.filter(item => item.priority === "24h").length,
      inProgress: techMaintenance.filter(item => item.status === "in_progress").length,
      completed: techMaintenance.filter(item => item.status === "completed").length,
      // Issues stats
      openIssues: techIssues.filter(issue => issue.status === "open").length,
      inProgressIssues: techIssues.filter(issue => issue.status === "in_progress").length,
      resolvedIssues: techIssues.filter(issue => issue.status === "resolved").length,
      totalIssues: techIssues.length,
      // Services stats
      totalServices: techServices.length,
      // Combined total
      total: techMaintenance.length + techIssues.length + techServices.length,
    };
  };

  // Unassigned stats
  const getUnassignedStats = () => {
    // Maintenance items without technician
    const unassignedMaintenance = maintenanceItems.filter(item => !item.technician_name);
    
    // Issues without technician
    const unassignedIssues = issues.filter(issue => !issue.technician_name);
    
    // Services without technician (shouldn't happen but check anyway)
    const unassignedServices = services.filter(service => !service.technician_name);
    
    return {
      // Maintenance stats
      yearly: unassignedMaintenance.filter(item => item.source === "auto_yearly" || item.maintenance_type === "routine").length,
      issue12h: unassignedMaintenance.filter(item => item.priority === "12h").length,
      issue24h: unassignedMaintenance.filter(item => item.priority === "24h").length,
      inProgress: unassignedMaintenance.filter(item => item.status === "in_progress").length,
      completed: unassignedMaintenance.filter(item => item.status === "completed").length,
      // Issues stats
      openIssues: unassignedIssues.filter(issue => issue.status === "open").length,
      inProgressIssues: unassignedIssues.filter(issue => issue.status === "in_progress").length,
      resolvedIssues: unassignedIssues.filter(issue => issue.status === "resolved").length,
      totalIssues: unassignedIssues.length,
      // Services stats
      totalServices: unassignedServices.length,
      // Combined total
      total: unassignedMaintenance.length + unassignedIssues.length + unassignedServices.length,
    };
  };

  const maintenanceTypeColors = {
    routine: "bg-emerald-500",      // Green for yearly maintenance
    inspection: "bg-emerald-500",
    calibration: "bg-emerald-500",
    issue_inspection: "bg-orange-500",  // Orange for 12h issue tasks
    issue_replacement: "bg-orange-500", // Orange for 12h replacement
    issue_service: "bg-red-500",        // Red for 24h service tasks
  };

  // Get color based on task type, priority and status
  const getTaskColor = (item) => {
    if (item.status === "completed") return "bg-slate-800 text-white";  // Black/dark for finished
    if (item.status === "in_progress") return "bg-blue-500 text-white"; // Blue for in progress
    
    // Customer issues - purple color
    if (item.source === "customer_issue") {
      return "bg-purple-100 text-purple-800";
    }
    
    // For scheduled items
    if (item.source === "auto_yearly" || item.maintenance_type === "routine") {
      return "bg-emerald-100 text-emerald-800"; // Green for yearly maintenance
    }
    if (item.priority === "12h") {
      return "bg-orange-100 text-orange-800"; // Orange for 12h
    }
    if (item.priority === "24h") {
      return "bg-red-100 text-red-800"; // Red for 24h
    }
    return "bg-blue-100 text-blue-800"; // Default blue
  };

  const getTaskBorderColor = (item) => {
    if (item.status === "completed") return "border-slate-800";
    if (item.status === "in_progress") return "border-blue-500";
    if (item.source === "customer_issue") return "border-purple-500";
    if (item.source === "auto_yearly" || item.maintenance_type === "routine") return "border-emerald-500";
    if (item.priority === "12h") return "border-orange-500";
    if (item.priority === "24h") return "border-red-500";
    return "border-blue-500";
  };

  // Calculate SLA time remaining for customer issues
  const calculateSLARemaining = (item) => {
    if (item.source !== "customer_issue" || item.status === "completed") return null;
    
    const scheduledDate = new Date(item.scheduled_date);
    const now = new Date();
    const diffMs = scheduledDate - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: t("time.slaExpired") };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { expired: false, text: t("time.hoursLeft", { hours, minutes }) };
    }
    return { expired: false, text: t("time.minutesLeft", { minutes }), urgent: true };
  };

  const statusColors = {
    scheduled: "bg-amber-100 text-amber-800 border-amber-200",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-slate-100 text-slate-800 border-slate-300",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Add padding days for week alignment
  const startPadding = monthStart.getDay();
  const paddingDays = Array(startPadding).fill(null);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t("calendar.title")}
          </h1>
          <p className="text-slate-500 mt-1">{t("calendar.scheduleAndTrack") || "Schedule and track maintenance for all units"}</p>
        </div>
        <Button
          onClick={() => openNewMaintenanceDialog()}
          className="bg-[#0066CC] hover:bg-[#0052A3]"
          data-testid="schedule-maintenance-btn"
        >
          <Plus size={18} className="mr-2" />
          {t("maintenance.scheduleMaintenance")}
        </Button>
      </div>

      {/* Stats Cards - Interactive */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card 
          data-testid="stat-upcoming" 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openStatsPopup("upcoming")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t("calendar.upcoming")} (30 {t("calendar.days") || "days"})</p>
                <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {upcomingCount.upcoming}
                </p>
                <p className="text-xs text-[#0066CC] mt-1">{t("services.clickForDetails")}</p>
              </div>
              <div className="w-12 h-12 bg-[#0066CC] rounded-xl flex items-center justify-center">
                <Clock className="text-white" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          data-testid="stat-overdue"
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openStatsPopup("overdue")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t("calendar.overdue")}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {upcomingCount.overdue}
                </p>
                <p className="text-xs text-red-500 mt-1">{t("services.clickForDetails")}</p>
              </div>
              <div className={`w-12 h-12 ${upcomingCount.overdue > 0 ? 'bg-red-500' : 'bg-slate-400'} rounded-xl flex items-center justify-center`}>
                <AlertTriangle className="text-white" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          data-testid="stat-this-month"
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => openStatsPopup("this-month")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t("calendar.thisMonth") || "This Month"}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {filteredMaintenance.filter(m => m.status === "scheduled").length}
                </p>
                <p className="text-xs text-emerald-500 mt-1">{t("services.clickForDetails")}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <CalendarDays className="text-white" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* City Filter */}
        <Card data-testid="city-filter-card">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500 mb-2">{t("common.filterByCity") || "Filter by City"}</p>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger data-testid="calendar-city-filter">
                <Building2 size={16} className="mr-2" />
                <SelectValue placeholder={t("common.allCities") || "All cities"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allCities") || "All Cities"}</SelectItem>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Legend & Technician Stats */}
      <Card>
        <CardContent className="pt-4 pb-4">
          {/* Legend Row */}
          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <span className="font-medium text-slate-600">{t("calendar.legend")}:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-slate-600">Yearly Maintenance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span className="text-slate-600">Customer Issue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span className="text-slate-600">Issue - 12h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span className="text-slate-600">Issue - 24h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-slate-600">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-800"></div>
              <span className="text-slate-600">Completed</span>
            </div>
          </div>

          {/* Technician Filter & Stats */}
          <div className="border-t pt-4">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <span className="font-medium text-slate-600">Filter by Technician:</span>
              
              {/* OPTIMIZATION 5: Quick filter buttons for "My Tasks" */}
              <div className="flex gap-2">
                <Button
                  variant={technicianFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTechnicianFilter("all")}
                  className={technicianFilter === "all" ? "bg-[#0066CC] hover:bg-[#0052A3]" : ""}
                >
                  All Tasks
                </Button>
                {TECHNICIANS.map((tech) => (
                  <Button
                    key={tech}
                    variant={technicianFilter === tech ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTechnicianFilter(tech)}
                    className={technicianFilter === tech ? "bg-[#0066CC] hover:bg-[#0052A3]" : ""}
                  >
                    <User size={14} className="mr-1" />
                    {tech}
                  </Button>
                ))}
              </div>
            </div>

            {/* Summary for selected technician */}
            {technicianFilter !== "all" && technicianFilter !== "unassigned" && (() => {
              const stats = getTechnicianStats(technicianFilter);
              const todayTasks = filteredMaintenance.filter(item => {
                const itemDate = new Date(item.scheduled_date);
                const today = new Date();
                return itemDate.toDateString() === today.toDateString() && item.status !== "completed";
              });
              const urgentTasks = filteredMaintenance.filter(item => {
                if (item.status === "completed") return false;
                if (item.source === "customer_issue") {
                  const sla = calculateSLARemaining(item);
                  return sla && (sla.expired || sla.text.includes("m left") || parseInt(sla.text) < 3);
                }
                return false;
              });
              return (
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{todayTasks.length}</p>
                    <p className="text-xs text-slate-600">Today's Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{urgentTasks.length}</p>
                    <p className="text-xs text-slate-600">Urgent (SLA)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
                    <p className="text-xs text-slate-600">Total Active</p>
                  </div>
                </div>
              );
            })()}

            {/* Technician Statistics Table - Show full table for "All", single row for specific technician */}
            {technicianFilter !== "all" ? (
              // Single technician stats
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-slate-600">Technician</th>
                      <th className="text-center py-2 px-2 font-medium text-emerald-600" title="Yearly Maintenance">Yearly</th>
                      <th className="text-center py-2 px-2 font-medium text-orange-600" title="12h Priority">12h</th>
                      <th className="text-center py-2 px-2 font-medium text-red-600" title="24h Priority">24h</th>
                      <th className="text-center py-2 px-2 font-medium text-amber-600" title="Open Issues">Issues (Open)</th>
                      <th className="text-center py-2 px-2 font-medium text-blue-600" title="In Progress Issues">Issues (Progress)</th>
                      <th className="text-center py-2 px-2 font-medium text-emerald-600" title="Resolved Issues">Issues (Resolved)</th>
                      <th className="text-center py-2 px-2 font-medium text-purple-600" title="Service Records">Services</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const stats = technicianFilter === "unassigned" 
                        ? getUnassignedStats() 
                        : getTechnicianStats(technicianFilter);
                      const displayName = technicianFilter === "unassigned" ? "Unassigned" : technicianFilter;
                      return (
                        <tr className="border-b bg-blue-50">
                          <td className={`py-2 px-2 font-medium ${technicianFilter === "unassigned" ? "text-slate-500 italic" : ""}`}>
                            {displayName}
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                              {stats.yearly}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
                              {stats.issue12h}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                              {stats.issue24h}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                              {stats.openIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              {stats.inProgressIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                              {stats.resolvedIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                              {stats.totalServices}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="font-bold text-slate-900">{stats.total}</span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              // Full table for all technicians
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-slate-600">Technician</th>
                      <th className="text-center py-2 px-2 font-medium text-emerald-600" title="Yearly Maintenance">Yearly</th>
                      <th className="text-center py-2 px-2 font-medium text-orange-600" title="12h Priority">12h</th>
                      <th className="text-center py-2 px-2 font-medium text-red-600" title="24h Priority">24h</th>
                      <th className="text-center py-2 px-2 font-medium text-amber-600" title="Open Issues">Issues (Open)</th>
                      <th className="text-center py-2 px-2 font-medium text-blue-600" title="In Progress Issues">Issues (Progress)</th>
                      <th className="text-center py-2 px-2 font-medium text-emerald-600" title="Resolved Issues">Issues (Resolved)</th>
                      <th className="text-center py-2 px-2 font-medium text-purple-600" title="Service Records">Services</th>
                      <th className="text-center py-2 px-2 font-medium text-slate-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TECHNICIANS.map((tech) => {
                      const stats = getTechnicianStats(tech);
                      return (
                        <tr 
                          key={tech} 
                          className="border-b hover:bg-slate-50 cursor-pointer"
                          onClick={() => setTechnicianFilter(tech)}
                        >
                          <td className="py-2 px-2 font-medium">{tech}</td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                              {stats.yearly}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
                              {stats.issue12h}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                              {stats.issue24h}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                              {stats.openIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              {stats.inProgressIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                              {stats.resolvedIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                              {stats.totalServices}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="font-bold text-slate-900">{stats.total}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Unassigned row */}
                    {(() => {
                      const stats = getUnassignedStats();
                      return (
                        <tr 
                          className="border-b hover:bg-slate-50 cursor-pointer"
                          onClick={() => setTechnicianFilter("unassigned")}
                        >
                          <td className="py-2 px-2 font-medium text-slate-500 italic">Unassigned</td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                              {stats.yearly}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
                              {stats.issue12h}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                              {stats.issue24h}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                              {stats.openIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              {stats.inProgressIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                              {stats.resolvedIssues}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                              {stats.totalServices}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className="font-bold text-slate-900">{stats.total}</span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card data-testid="maintenance-calendar">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                data-testid="prev-month-btn"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                data-testid="today-btn"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                data-testid="next-month-btn"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding days */}
            {paddingDays.map((_, index) => (
              <div key={`pad-${index}`} className="min-h-[100px] bg-slate-50 rounded-lg" />
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day) => {
              const dayMaintenance = getMaintenanceForDate(day);
              const isPast = isBefore(day, new Date()) && !isToday(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] border rounded-lg p-1 transition-colors cursor-pointer hover:bg-slate-50 ${
                    isToday(day) ? "border-[#0066CC] bg-blue-50/50" : "border-slate-200"
                  } ${isPast ? "bg-slate-50/50" : ""}`}
                  onClick={() => openNewMaintenanceDialog(day)}
                  data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-[#0066CC]" : "text-slate-700"}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayMaintenance.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate ${getTaskColor(item)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(item);
                        }}
                        data-testid={`maintenance-item-${item.id}`}
                      >
                        {getProductSerial(item.product_id)}
                      </div>
                    ))}
                    {dayMaintenance.length > 3 && (
                      <div className="text-xs text-slate-500 px-1">
                        +{dayMaintenance.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled List for Current Month */}
      <Card data-testid="maintenance-list">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
            Scheduled for {format(currentMonth, "MMMM yyyy")} {cityFilter !== "all" && `- ${cityFilter}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMaintenance.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-500 mt-4">No maintenance scheduled this month</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMaintenance.map((item) => {
                // Find linked issue for customer issues
                const linkedIssue = item.source === "customer_issue" && item.issue_id 
                  ? issues.find(i => i.id === item.issue_id) 
                  : null;
                
                return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-l-4 bg-white border ${getTaskBorderColor(item)}`}
                  data-testid={`list-item-${item.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-12 rounded-full ${
                      item.status === "completed" ? "bg-slate-800" :
                      item.status === "in_progress" ? "bg-blue-500" :
                      item.source === "customer_issue" ? "bg-purple-500" :
                      item.source === "auto_yearly" || item.maintenance_type === "routine" ? "bg-emerald-500" :
                      item.priority === "12h" ? "bg-orange-500" :
                      item.priority === "24h" ? "bg-red-500" : "bg-blue-500"
                    }`} />
                    <div>
                      <p className="font-medium text-slate-900">
                        S/N: {getProductSerial(item.product_id)}
                      </p>
                      <p className="text-sm text-slate-600 capitalize">
                        {item.maintenance_type === "customer_issue" ? "Customer Issue" : item.maintenance_type.replace("_", " ")} • {item.source === "customer_issue" ? (
                          <span className="font-medium text-purple-700">
                            Solve by: {format(parseISO(item.scheduled_date), "MMM d, yyyy HH:mm")}
                          </span>
                        ) : (
                          format(parseISO(item.scheduled_date), "MMM d, yyyy HH:mm")
                        )}
                      </p>
                      {/* Notes for customer issues */}
                      {item.source === "customer_issue" && item.notes && (
                        <p className="text-xs text-slate-500 mt-1 max-w-md truncate">
                          {item.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <Building2 size={10} className="mr-1" />
                          {getProductCity(item.product_id)}
                        </Badge>
                        {item.source === "customer_issue" && (
                          <Badge className="text-xs bg-purple-100 text-purple-800">
                            <Users size={10} className="mr-1" />
                            Customer Issue
                          </Badge>
                        )}
                        {/* SLA Time Remaining for customer issues */}
                        {item.source === "customer_issue" && item.status !== "completed" && linkedIssue?.status !== "resolved" && (() => {
                          const sla = calculateSLARemaining(item);
                          if (!sla) return null;
                          return (
                            <Badge className={`text-xs ${sla.expired ? "bg-red-500 text-white" : sla.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                              <Timer size={10} className="mr-1" />
                              {sla.text}
                            </Badge>
                          );
                        })()}
                        {/* Show Resolved badge for resolved linked issues */}
                        {item.source === "customer_issue" && linkedIssue?.status === "resolved" && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-800">
                            <CheckCircle size={10} className="mr-1" />
                            Resolved
                          </Badge>
                        )}
                        {item.priority && item.source !== "customer_issue" && (
                          <Badge className={`text-xs ${item.priority === "12h" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}`}>
                            {item.priority}
                          </Badge>
                        )}
                        {item.source === "auto_yearly" && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-800">Yearly</Badge>
                        )}
                        {item.source === "issue" && (
                          <Badge className="text-xs bg-amber-100 text-amber-800">From Issue</Badge>
                        )}
                        {item.technician_name && (
                          <span className="text-xs text-slate-500">Tech: {item.technician_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[item.status]}`}>
                      {item.status}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`menu-${item.id}`}>
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(item)}>
                          <Wrench size={14} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        {item.status === "scheduled" && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, "completed")}>
                              <CheckCircle size={14} className="mr-2" /> Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, "cancelled")}>
                              <XCircle size={14} className="mr-2" /> Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                        {item.status !== "scheduled" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(item.id, "scheduled")}>
                            <Clock size={14} className="mr-2" /> Reschedule
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent data-testid="schedule-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {selectedItem ? "Edit Scheduled Maintenance" : "Schedule Maintenance"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Product *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger className="mt-1" data-testid="schedule-select-product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.serial_number} - {product.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduled_date">Scheduled Date *</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
                data-testid="schedule-input-date"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Maintenance Type *</Label>
              <Select
                value={formData.maintenance_type}
                onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
              >
                <SelectTrigger className="mt-1" data-testid="schedule-select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine Maintenance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="technician_name">Assigned Technician</Label>
              <Select
                value={formData.technician_name}
                onValueChange={(value) => setFormData({ ...formData, technician_name: value })}
              >
                <SelectTrigger className="mt-1" data-testid="schedule-select-technician">
                  <SelectValue placeholder="Select technician (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {TECHNICIANS.map((tech) => (
                    <SelectItem key={tech} value={tech}>
                      {tech}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                data-testid="schedule-input-notes"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#0066CC] hover:bg-[#0052A3]"
                disabled={!formData.product_id || !formData.scheduled_date || !formData.maintenance_type}
                data-testid="submit-schedule-btn"
              >
                {selectedItem ? "Update" : "Schedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Popup Dialog */}
      <Dialog open={statsPopupOpen} onOpenChange={setStatsPopupOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" data-testid="stats-popup-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }} className="flex items-center gap-2">
              {statsPopupType === "upcoming" && <Clock size={20} className="text-[#0066CC]" />}
              {statsPopupType === "overdue" && <AlertTriangle size={20} className="text-red-500" />}
              {statsPopupType === "this-month" && <CalendarDays size={20} className="text-emerald-500" />}
              {getStatsPopupTitle()}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh] mt-4">
            {statsPopupLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : statsPopupData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No maintenance records found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left py-3 px-3 font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-600">Product S/N</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-600">City</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-600">Type</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-600">Technician</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-600">Priority</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-600">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statsPopupData.map((item) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <span className={`font-medium ${
                            statsPopupType === "overdue" ? "text-red-600" : "text-slate-900"
                          }`}>
                            {new Date(item.scheduled_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">
                          {product?.serial_number || "Unknown"}
                        </td>
                        <td className="py-3 px-3">
                          {product?.city || "Unknown"}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.source === "customer_issue" ? "bg-purple-100 text-purple-800" :
                            item.source === "auto_yearly" || item.maintenance_type === "routine" ? "bg-emerald-100 text-emerald-800" :
                            item.priority === "12h" ? "bg-orange-100 text-orange-800" :
                            item.priority === "24h" ? "bg-red-100 text-red-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {item.maintenance_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {item.technician_name || (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.priority && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.priority === "12h" ? "bg-orange-500 text-white" : "bg-red-500 text-white"
                            }`}>
                              {item.priority}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-slate-600">
                          {item.notes || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setStatsPopupOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceCalendar;
