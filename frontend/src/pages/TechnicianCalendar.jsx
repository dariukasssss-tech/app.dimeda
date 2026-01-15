import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Building2,
  Timer,
  X,
  Users,
  Play,
  MapPin,
  FileText,
  AlertTriangle,
  Wrench,
  Shield,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from "date-fns";
import ContactDetailsPopup from "@/components/ContactDetailsPopup";

const TechnicianCalendar = ({ selectedTechnician }) => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [issues, setIssues] = useState([]); // Track issues for status updates
  const [unavailableDays, setUnavailableDays] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [selectedMonthForStats, setSelectedMonthForStats] = useState(format(new Date(), "yyyy-MM"));
  // Day popup state
  const [dayPopupOpen, setDayPopupOpen] = useState(false);
  const [selectedDayItems, setSelectedDayItems] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  // Task detail popup state
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  // Schedule Roll-in task state
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (selectedTechnician) {
      fetchData();
      fetchUnavailableDays();
    }
  }, [currentMonth, selectedTechnician]);

  useEffect(() => {
    if (selectedTechnician) {
      calculateMonthlyStats();
    }
  }, [selectedMonthForStats, maintenanceItems, selectedTechnician]);

  const fetchData = async () => {
    try {
      const [maintenanceRes, productsRes, issuesRes] = await Promise.all([
        axios.get(`${API}/scheduled-maintenance`),
        axios.get(`${API}/products`),
        axios.get(`${API}/issues`),
      ]);
      
      // Filter by selected technician
      const technicianMaintenance = maintenanceRes.data.filter(
        m => m.technician_name === selectedTechnician
      );
      
      // Filter issues by technician
      const technicianIssues = issuesRes.data.filter(
        i => i.technician_name === selectedTechnician
      );
      
      setMaintenanceItems(technicianMaintenance);
      setProducts(productsRes.data);
      setIssues(technicianIssues);
    } catch (error) {
      toast.error("Failed to fetch calendar data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnavailableDays = async () => {
    try {
      const response = await axios.get(`${API}/technician-unavailable/${selectedTechnician}`);
      setUnavailableDays(response.data.map(d => d.date));
    } catch (error) {
      console.error("Failed to fetch unavailable days");
    }
  };

  // Mark issue as "In Progress" - will appear in Services page
  const handleMarkInProgress = async (maintenanceItem) => {
    if (!maintenanceItem.issue_id) {
      toast.error("No linked issue found");
      return;
    }
    
    try {
      await axios.put(`${API}/issues/${maintenanceItem.issue_id}`, {
        status: "in_progress"
      });
      
      // Update local maintenance item status
      await axios.put(`${API}/scheduled-maintenance/${maintenanceItem.id}`, {
        status: "in_progress"
      });
      
      toast.success("Issue marked as In Progress - now visible in Services");
      fetchData(); // Refresh data
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  // Get linked issue for a maintenance item
  const getLinkedIssue = (maintenanceItem) => {
    if (!maintenanceItem.issue_id) return null;
    return issues.find(i => i.id === maintenanceItem.issue_id);
  };

  // Get parent issue for a warranty route issue
  const getParentIssue = (issue) => {
    if (!issue?.parent_issue_id) return null;
    return issues.find(i => i.id === issue.parent_issue_id);
  };

  // Get child repair issues for a parent issue
  const getChildIssues = (issue) => {
    if (!issue?.child_issue_id) return [];
    return issues.filter(i => i.parent_issue_id === issue.id);
  };

  // Calculate warranty repair time remaining (24h from creation)
  const calculateRepairTimeRemaining = (issue) => {
    if (!issue?.is_warranty_route || issue.status === "resolved") return null;
    
    const createdAt = new Date(issue.created_at);
    const deadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: "Time Expired", urgent: true };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { expired: false, text: `${hours}h ${minutes}m left`, urgent: hours < 6 };
    }
    return { expired: false, text: `${minutes}m left`, urgent: true };
  };

  // Handle continue for warranty repair tasks
  const handleContinueRepair = async (maintenanceItem) => {
    if (!maintenanceItem.issue_id) {
      toast.error("No linked issue found");
      return;
    }
    
    try {
      await axios.put(`${API}/issues/${maintenanceItem.issue_id}`, {
        status: "in_progress"
      });
      
      await axios.put(`${API}/scheduled-maintenance/${maintenanceItem.id}`, {
        status: "in_progress"
      });
      
      toast.success("Continuing repair task - visible in Services");
      fetchData();
    } catch (error) {
      toast.error("Failed to continue repair");
    }
  };

  // Handle day click - show popup with day's tasks
  const handleDayClick = (day, dayItems, e) => {
    e.stopPropagation();
    if (dayItems.length > 0) {
      setSelectedDay(day);
      setSelectedDayItems(dayItems);
      setDayPopupOpen(true);
    }
  };

  // Handle task click - show detailed popup
  const handleTaskClick = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedTask(item);
    setTaskDetailOpen(true);
  };

  const toggleUnavailableDay = async (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const isUnavailable = unavailableDays.includes(dateStr);
    
    try {
      if (isUnavailable) {
        await axios.delete(`${API}/technician-unavailable/${selectedTechnician}/${dateStr}`);
        setUnavailableDays(prev => prev.filter(d => d !== dateStr));
        toast.success("Day marked as available");
      } else {
        await axios.post(`${API}/technician-unavailable`, {
          technician_name: selectedTechnician,
          date: dateStr,
        });
        setUnavailableDays(prev => [...prev, dateStr]);
        toast.success("Day marked as unavailable");
      }
    } catch (error) {
      toast.error("Failed to update availability");
    }
  };

  const calculateMonthlyStats = () => {
    const [year, month] = selectedMonthForStats.split("-").map(Number);
    
    const monthItems = maintenanceItems.filter(item => {
      const itemDate = new Date(item.scheduled_date);
      return itemDate.getMonth() + 1 === month && itemDate.getFullYear() === year;
    });
    
    setMonthlyStats({
      total: monthItems.length,
      completed: monthItems.filter(i => i.status === "completed").length,
      scheduled: monthItems.filter(i => i.status === "scheduled").length,
      inProgress: monthItems.filter(i => {
        // Check if the linked issue is resolved - if so, don't count as in_progress
        if (i.status === "in_progress" && i.issue_id) {
          const linkedIssue = issues.find(issue => issue.id === i.issue_id);
          if (linkedIssue?.status === "resolved") return false;
        }
        return i.status === "in_progress";
      }).length,
      customerIssues: monthItems.filter(i => i.source === "customer_issue").length,
      yearlyMaintenance: monthItems.filter(i => i.source === "auto_yearly").length,
    });
  };

  const getProductSerial = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const getProductCity = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.city || "Unknown";
  };

  // Get color based on task type
  const getTaskColor = (item) => {
    if (item.status === "completed") return "bg-slate-800";
    if (item.status === "in_progress") return "bg-blue-500";
    if (item.source === "warranty_service") return "bg-orange-500";
    if (item.source === "customer_issue") return "bg-purple-500";
    if (item.source === "auto_yearly") return "bg-emerald-500";
    if (item.priority === "12h") return "bg-orange-500";
    if (item.priority === "24h") return "bg-red-500";
    return "bg-blue-500";
  };

  // Get product model type
  const getProductModelType = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.model_type || "powered";
  };

  // Calculate SLA time remaining
  // NOTE: Roll-in stretchers do NOT have SLA timer
  const calculateSLARemaining = (item) => {
    if (item.source !== "customer_issue" || item.status === "completed") return null;
    
    // Skip SLA for Roll-in stretchers
    const modelType = getProductModelType(item.product_id);
    if (modelType === "roll_in") return null;
    
    const scheduledDate = new Date(item.scheduled_date);
    const now = new Date();
    const diffMs = scheduledDate - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: "SLA Expired" };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { expired: false, text: `${hours}h ${minutes}m left` };
    }
    return { expired: false, text: `${minutes}m left`, urgent: true };
  };

  // Generate calendar days
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Get items for a specific day
  const getItemsForDay = (date) => {
    return maintenanceItems.filter((item) => {
      const itemDate = new Date(item.scheduled_date);
      return isSameDay(itemDate, date);
    });
  };

  // Filtered items for the list below calendar
  const filteredMaintenance = maintenanceItems
    .filter((item) => {
      const itemDate = new Date(item.scheduled_date);
      return isSameMonth(itemDate, currentMonth);
    })
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  // Generate month options for filter
  const monthOptions = [];
  for (let i = -6; i <= 6; i++) {
    const date = addMonths(new Date(), i);
    monthOptions.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    });
  }

  if (!selectedTechnician) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="mx-auto text-slate-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
              No Technician Selected
            </h2>
            <p className="text-slate-400 mt-2">
              Please select a technician from the Dashboard to view their calendar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="technician-calendar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Calendar
          </h1>
          <p className="text-slate-500 mt-1">
            Viewing schedule for {selectedTechnician}
          </p>
        </div>
      </div>

      {/* Calendar Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft size={20} />
            </Button>
            <CardTitle className="text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first day of month */}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-slate-50 rounded-lg" />
            ))}

            {/* Calendar days */}
            {days.map((day) => {
              const dayItems = getItemsForDay(day);
              const dateStr = format(day, "yyyy-MM-dd");
              const isUnavailable = unavailableDays.includes(dateStr);
              const hasTasks = dayItems.length > 0;
              
              return (
                <div
                  key={day.toISOString()}
                  className={`h-24 border rounded-lg p-1 transition-all cursor-pointer relative ${
                    isToday(day)
                      ? "border-[#0066CC] border-2 bg-blue-50"
                      : isUnavailable
                      ? "bg-red-50 border-red-200"
                      : hasTasks
                      ? "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-emerald-400"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={(e) => hasTasks ? handleDayClick(day, dayItems, e) : toggleUnavailableDay(day)}
                  title={hasTasks ? `${dayItems.length} task(s) - Click to view details` : (isUnavailable ? "Click to mark as available" : "Click to mark as unavailable")}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      isToday(day) ? "text-[#0066CC]" : "text-slate-700"
                    }`}>
                      {format(day, "d")}
                    </span>
                    {isUnavailable && (
                      <X size={14} className="text-red-500" />
                    )}
                    {hasTasks && !isUnavailable && (
                      <span className="text-xs bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        {dayItems.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Task indicators */}
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`w-2 h-2 rounded-full ${getTaskColor(item)}`}
                        title={`${getProductSerial(item.product_id)} - ${item.maintenance_type}`}
                      />
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-xs text-slate-400">+{dayItems.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend and Monthly Stats */}
      <Card>
        <CardContent className="pt-4 pb-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <span className="font-medium text-slate-600">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-slate-600">Yearly</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span className="text-slate-600">Customer Issue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span className="text-slate-600">Warranty Repair</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-slate-800"></div>
              <span className="text-slate-600">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <X size={14} className="text-red-500" />
              <span className="text-slate-600">Unavailable</span>
            </div>
          </div>

          {/* Monthly Stats Filter */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-slate-600">Monthly Summary</span>
              <Select value={selectedMonthForStats} onValueChange={setSelectedMonthForStats}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {monthlyStats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xl font-bold text-slate-700">{monthlyStats.total}</p>
                  <p className="text-xs text-slate-500">Total Tasks</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xl font-bold text-emerald-600">{monthlyStats.completed}</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">{monthlyStats.scheduled}</p>
                  <p className="text-xs text-slate-500">Scheduled</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xl font-bold text-amber-600">{monthlyStats.inProgress}</p>
                  <p className="text-xs text-slate-500">In Progress</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xl font-bold text-purple-600">{monthlyStats.customerIssues}</p>
                  <p className="text-xs text-slate-500">Customer Issues</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{monthlyStats.yearlyMaintenance}</p>
                  <p className="text-xs text-slate-500">Yearly Maint.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Tasks - Interactive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <CalendarDays size={20} />
            Scheduled for {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : filteredMaintenance.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No scheduled tasks for this month
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredMaintenance.map((item) => {
                const linkedIssue = getLinkedIssue(item);
                const product = products.find(p => p.id === item.product_id);
                const isRollIn = product?.model_type === "roll_in";
                const isPendingSchedule = item.status === "pending_schedule";
                const canStartWork = item.source === "customer_issue" && item.status === "scheduled" && linkedIssue && linkedIssue.status !== "resolved" && !isRollIn;
                const canStartRollInWork = item.source === "customer_issue" && item.status === "scheduled" && linkedIssue && linkedIssue.status !== "resolved" && isRollIn;
                const isWarrantyRepair = item.source === "warranty_service" || linkedIssue?.is_warranty_route;
                const canContinueRepair = isWarrantyRepair && item.status === "scheduled" && linkedIssue && linkedIssue.status !== "resolved";
                const repairTime = linkedIssue ? calculateRepairTimeRemaining(linkedIssue) : null;
                
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border-l-4 bg-white shadow-sm hover:shadow-md transition-all ${
                      linkedIssue?.status === "resolved" ? "border-slate-800 bg-slate-50" :
                      item.status === "completed" ? "border-slate-800 bg-slate-50" :
                      isWarrantyRepair ? "border-orange-500 bg-orange-50" :
                      item.source === "customer_issue" && isRollIn ? "border-teal-500" :
                      item.source === "customer_issue" ? "border-purple-500" :
                      item.source === "auto_yearly" ? "border-emerald-500" :
                      item.priority === "12h" ? "border-orange-500" :
                      "border-blue-500"
                    }`}
                  >
                    {/* Header with S/N and Status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {product?.serial_number || "Unknown"}
                        </span>
                        {linkedIssue?.issue_code && (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-xs font-mono">
                            {linkedIssue.issue_code}
                          </span>
                        )}
                      </div>
                      <Badge className={`text-xs ${
                        linkedIssue?.status === "resolved" ? "bg-emerald-500 text-white" :
                        item.status === "completed" ? "bg-slate-800 text-white" :
                        item.status === "in_progress" ? "bg-blue-500 text-white" :
                        isPendingSchedule ? "bg-amber-500 text-white" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {linkedIssue?.status === "resolved" ? "resolved" : 
                         isPendingSchedule ? "Schedule" : item.status}
                      </Badge>
                    </div>
                    
                    {/* Warranty Repair indicator */}
                    {isWarrantyRepair && item.status !== "completed" && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-orange-100 rounded-lg">
                        <Wrench size={14} className="text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Warranty Repair Task</span>
                        {repairTime && (
                          <Badge className={`text-xs ml-auto ${repairTime.expired ? "bg-red-500 text-white animate-pulse" : repairTime.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                            <Timer size={10} className="mr-1" />
                            {repairTime.text}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* City and Type - clickable for details */}
                    <div 
                      className="flex items-center gap-3 text-sm text-slate-600 mb-2 cursor-pointer hover:text-slate-800"
                      onClick={(e) => handleTaskClick(item, e)}
                    >
                      <span className="flex items-center gap-1">
                        <MapPin size={14} className="text-slate-400" />
                        {product?.city || "Unknown"}
                      </span>
                      <span className="capitalize">
                        {item.maintenance_type.replace("_", " ")}
                      </span>
                    </div>
                    
                    {/* Deadline - Only show for scheduled items with date (NOT for pending_schedule Roll-in) */}
                    {item.scheduled_date && !isPendingSchedule && (
                      <div 
                        className={`text-sm font-medium cursor-pointer ${
                          isWarrantyRepair ? "text-orange-700 hover:text-orange-900" :
                          item.source === "customer_issue" && isRollIn ? "text-teal-700 hover:text-teal-900" :
                          item.source === "customer_issue" ? "text-purple-700 hover:text-purple-900" : "text-slate-700 hover:text-slate-900"
                        }`}
                        onClick={(e) => handleTaskClick(item, e)}
                      >
                        <Clock size={14} className="inline mr-1" />
                        {isWarrantyRepair ? "Repair by: " : item.source === "customer_issue" ? "Solve by: " : ""}
                        {format(parseISO(item.scheduled_date), "MMM d, yyyy HH:mm")}
                      </div>
                    )}
                    
                    {/* Pending Schedule message for Roll-in */}
                    {isPendingSchedule && (
                      <div className="text-sm text-amber-700 font-medium mb-2">
                        <AlertTriangle size={14} className="inline mr-1" />
                        Please schedule this task
                      </div>
                    )}
                    </div>
                    
                    {/* Tags and Action Button */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isWarrantyRepair && (
                          <Badge className="text-xs bg-orange-100 text-orange-800">
                            <Shield size={10} className="mr-1" />
                            Warranty
                          </Badge>
                        )}
                        {/* Roll-in Stretcher badge */}
                        {item.source === "customer_issue" && isRollIn && !isWarrantyRepair && (
                          <Badge className="text-xs bg-teal-100 text-teal-800">
                            Roll-in
                          </Badge>
                        )}
                        {item.source === "customer_issue" && !isWarrantyRepair && !isRollIn && (
                          <Badge className="text-xs bg-purple-100 text-purple-800">
                            <Users size={10} className="mr-1" />
                            Customer
                          </Badge>
                        )}
                        {item.source === "auto_yearly" && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-800">Yearly</Badge>
                        )}
                        {/* SLA timer - NOT for Roll-in */}
                        {item.source === "customer_issue" && item.status !== "completed" && linkedIssue?.status !== "resolved" && !isRollIn && (() => {
                          const sla = calculateSLARemaining(item);
                          if (!sla) return null;
                          return (
                            <Badge className={`text-xs ${sla.expired ? "bg-red-500 text-white" : sla.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                              <Timer size={10} className="mr-1" />
                              {sla.text}
                            </Badge>
                          );
                        })()}
                        {/* Resolved badge */}
                        {linkedIssue?.status === "resolved" && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-800">
                            <CheckCircle size={10} className="mr-1" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      
                      {/* Schedule Button - for Roll-in pending schedule */}
                      {isPendingSchedule && isRollIn && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(item, e);
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          data-testid="schedule-btn"
                        >
                          <CalendarDays size={14} className="mr-1" />
                          Schedule
                        </Button>
                      )}
                      
                      {/* Start Work Button - for Roll-in after scheduled */}
                      {canStartRollInWork && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkInProgress(item);
                          }}
                          className="bg-teal-600 hover:bg-teal-700 text-white"
                          data-testid="start-work-btn"
                        >
                          <Play size={14} className="mr-1" />
                          Start Work
                        </Button>
                      )}
                      
                      {/* Start Work Button - visible on card for Powered customer issues */}
                      {canStartWork && !isWarrantyRepair && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkInProgress(item);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          data-testid="start-work-btn"
                        >
                          <Play size={14} className="mr-1" />
                          Start Work
                        </Button>
                      )}
                      
                      {/* Continue Button - for warranty repair tasks */}
                      {canContinueRepair && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContinueRepair(item);
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white"
                          data-testid="continue-repair-btn"
                        >
                          <Play size={14} className="mr-1" />
                          Continue
                        </Button>
                      )}
                      
                      {/* Show status badges for in_progress/resolved */}
                      {item.status === "in_progress" && linkedIssue && linkedIssue.status === "in_progress" && !isWarrantyRepair && (
                        <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                          <Clock size={14} className="mr-1" />
                          Working...
                        </Badge>
                      )}
                      
                      {/* In Progress badge for warranty repairs */}
                      {item.status === "in_progress" && isWarrantyRepair && linkedIssue && linkedIssue.status === "in_progress" && (
                        <Badge className="bg-orange-100 text-orange-800 px-3 py-1">
                          <Wrench size={14} className="mr-1" />
                          Repairing...
                        </Badge>
                      )}
                      {item.status === "in_progress" && linkedIssue && linkedIssue.status === "resolved" && (
                        <Badge className="bg-emerald-100 text-emerald-800 px-3 py-1">
                          <CheckCircle size={14} className="mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                    
                    {/* Contact Details Button - only for tasks with linked issues */}
                    {linkedIssue && (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <ContactDetailsPopup 
                          issue={linkedIssue} 
                          products={products}
                        />
                      </div>
                    )}
                    
                    {/* Click hint - only show if no action button */}
                    {!canStartWork && item.status !== "in_progress" && (
                      <p className="text-xs text-slate-400 mt-2 text-right cursor-pointer" onClick={(e) => handleTaskClick(item, e)}>Click for details</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Popup Dialog */}
      <Dialog open={dayPopupOpen} onOpenChange={setDayPopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <CalendarDays size={20} className="text-emerald-600" />
              {selectedDay && format(selectedDay, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {selectedDayItems.map((item) => {
              const product = products.find(p => p.id === item.product_id);
              const linkedIssue = getLinkedIssue(item);
              return (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-lg border-l-4 bg-slate-50 cursor-pointer hover:bg-slate-100 ${
                    item.source === "customer_issue" ? "border-purple-500" :
                    item.source === "auto_yearly" ? "border-emerald-500" :
                    "border-blue-500"
                  }`}
                  onClick={() => {
                    setDayPopupOpen(false);
                    handleTaskClick(item);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{product?.serial_number || "Unknown"}</span>
                    <Badge className={`text-xs ${
                      item.status === "completed" ? "bg-slate-800 text-white" :
                      item.status === "in_progress" ? "bg-blue-500 text-white" :
                      "bg-slate-200 text-slate-700"
                    }`}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <MapPin size={14} />
                    {product?.city || "Unknown"}
                  </div>
                  <div className={`text-sm font-medium mt-1 ${item.source === "customer_issue" ? "text-purple-700" : "text-slate-700"}`}>
                    <Clock size={14} className="inline mr-1" />
                    {format(parseISO(item.scheduled_date), "HH:mm")} - {item.source === "customer_issue" ? "Deadline" : "Scheduled"}
                  </div>
                  {linkedIssue?.issue_code && (
                    <span className="mt-1 inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-xs font-mono">
                      {linkedIssue.issue_code}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setDayPopupOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Detail Popup Dialog - Same style as Services page */}
      <Dialog open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <FileText size={24} className="text-blue-600" />
              Task Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (() => {
            const product = products.find(p => p.id === selectedTask.product_id);
            const linkedIssue = getLinkedIssue(selectedTask);
            const isWarrantyRepair = selectedTask.source === "warranty_service" || linkedIssue?.warranty_service_type === "warranty";
            const isAwaitingRepair = linkedIssue?.status === "in_service";
            const isRepairing = linkedIssue?.status === "in_progress" && linkedIssue?.warranty_service_type === "warranty";
            const repairAttempts = linkedIssue?.repair_attempts || [];
            
            // Calculate repair time from warranty_repair_started_at
            const calcRepairTime = () => {
              if (!linkedIssue?.warranty_repair_started_at && !isWarrantyRepair) return null;
              const startTime = linkedIssue?.warranty_repair_started_at || linkedIssue?.created_at;
              if (!startTime) return null;
              const startDate = new Date(startTime);
              const deadline = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
              const now = new Date();
              const diffMs = deadline - now;
              
              if (diffMs <= 0) return { expired: true, text: "Time Expired", urgent: true };
              
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              return { 
                expired: false, 
                text: hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`, 
                urgent: hours < 6 
              };
            };
            const repairTime = calcRepairTime();
            
            return (
              <div className="space-y-6 mt-4">
                {/* Status Banner */}
                {(isAwaitingRepair || isRepairing || isWarrantyRepair) && linkedIssue && linkedIssue.status !== "resolved" && (
                  <div className={`p-4 rounded-xl border-2 ${
                    isAwaitingRepair ? "bg-orange-100 border-orange-300" : 
                    isRepairing ? "bg-blue-100 border-blue-300" : 
                    "bg-orange-50 border-orange-200"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isAwaitingRepair && <Timer size={24} className="text-orange-600" />}
                        {isRepairing && <Wrench size={24} className="text-blue-600" />}
                        {!isAwaitingRepair && !isRepairing && <Shield size={24} className="text-orange-600" />}
                        <div>
                          <h3 className="font-bold text-lg">
                            {isAwaitingRepair ? "Awaiting Repair" : isRepairing ? "Repair In Progress" : "Warranty Repair Task"}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {isAwaitingRepair ? "Click Continue to start repair work" : 
                             isRepairing ? "Complete the repair to resolve issue" : "Complete within 24 hours"}
                          </p>
                        </div>
                      </div>
                      {repairTime && (
                        <Badge className={`text-lg px-4 py-2 ${repairTime.expired ? "bg-red-500 text-white animate-pulse" : repairTime.urgent ? "bg-orange-500 text-white" : "bg-amber-200 text-amber-900"}`}>
                          <Timer size={16} className="mr-2" />
                          {repairTime.text}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Product Info */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 size={18} />
                    Product Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Serial Number:</span>
                      <p className="font-bold text-slate-900">{product?.serial_number || "Unknown"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">City:</span>
                      <p className="font-bold text-slate-900">{product?.city || "Unknown"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Model:</span>
                      <p className="font-bold text-slate-900">{product?.model_name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="font-bold text-slate-900">{linkedIssue?.product_location || product?.location_detail || "N/A"}</p>
                    </div>
                  </div>
                </div>
                
                {/* Task/Schedule Info */}
                <div className={`p-4 rounded-xl border ${isWarrantyRepair ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}>
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <CalendarDays size={18} />
                    Scheduled Task
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Type:</span>
                      <p className="font-bold text-slate-900 capitalize">{selectedTask.maintenance_type?.replace("_", " ")}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span>
                      <Badge className={`${
                        selectedTask.status === "completed" ? "bg-slate-800 text-white" :
                        selectedTask.status === "in_progress" ? "bg-blue-500 text-white" :
                        "bg-slate-200 text-slate-700"
                      }`}>
                        {selectedTask.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-slate-500">Scheduled:</span>
                      <p className="font-bold text-slate-900">{format(parseISO(selectedTask.scheduled_date), "MMM d, yyyy HH:mm")}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Priority:</span>
                      <p className="font-bold text-slate-900">{selectedTask.priority || "Normal"}</p>
                    </div>
                  </div>
                  {selectedTask.notes && (
                    <div className="mt-3 p-3 bg-white rounded-lg">
                      <span className="text-xs text-slate-500">Notes:</span>
                      <p className="text-sm text-slate-700">{selectedTask.notes}</p>
                    </div>
                  )}
                </div>
                
                {/* Linked Issue Info */}
                {linkedIssue && (
                  <div className={`p-4 rounded-xl border ${isWarrantyRepair ? "bg-orange-50 border-orange-200" : "bg-purple-50 border-purple-200"}`}>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <AlertTriangle size={18} />
                      {isWarrantyRepair ? "Issue Details" : "Linked Issue"}
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-slate-200 text-slate-800 font-mono font-bold">
                          {linkedIssue.issue_code}
                        </span>
                        <Badge className={`${
                          linkedIssue.severity === "critical" ? "bg-red-100 text-red-800" :
                          linkedIssue.severity === "high" ? "bg-orange-100 text-orange-800" :
                          linkedIssue.severity === "medium" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-800"
                        }`}>
                          {linkedIssue.severity}
                        </Badge>
                        <Badge variant="outline">{linkedIssue.issue_type}</Badge>
                        {linkedIssue.warranty_service_type === "warranty" && (
                          <Badge className="bg-green-100 text-green-800">
                            <Shield size={12} className="mr-1" />
                            Warranty
                          </Badge>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{linkedIssue.title}</h3>
                      </div>
                      <p className="text-slate-600 whitespace-pre-line">{linkedIssue.description}</p>
                      
                      {linkedIssue.resolution && (
                        <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-300">
                          <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">Resolution Notes</span>
                          <p className="text-base font-semibold text-slate-800 mt-2 whitespace-pre-line">{linkedIssue.resolution}</p>
                        </div>
                      )}
                      
                      {linkedIssue.source === "customer" && (
                        <div className="flex items-center gap-2 pt-2 text-purple-700">
                          <Users size={16} />
                          <span className="font-medium">Customer Reported Issue</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Repair Attempts (if more than 1) */}
                {repairAttempts.length > 1 && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Wrench size={18} />
                      Repair Attempts ({repairAttempts.length})
                    </h4>
                    <div className="space-y-2">
                      {repairAttempts.map((repair, idx) => (
                        <div key={repair.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                          <span className="font-medium">Repair #{idx + 1}</span>
                          <Badge className={
                            repair.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                            repair.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                            "bg-amber-100 text-amber-800"
                          }>
                            {repair.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(repair.started_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Timestamps */}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  {linkedIssue && <span>Issue Created: {new Date(linkedIssue.created_at).toLocaleString()}</span>}
                  {linkedIssue?.warranty_repair_started_at && (
                    <span>Repair Started: {new Date(linkedIssue.warranty_repair_started_at).toLocaleString()}</span>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setTaskDetailOpen(false)}>
                    Close
                  </Button>
                  
                  {/* Start Work for customer issues */}
                  {selectedTask.source === "customer_issue" && selectedTask.status === "scheduled" && linkedIssue && linkedIssue.status === "open" && (
                    <Button 
                      onClick={() => {
                        handleMarkInProgress(selectedTask);
                        setTaskDetailOpen(false);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                      data-testid="popup-start-work-btn"
                    >
                      <Play size={18} className="mr-2" />
                      Start Work
                    </Button>
                  )}
                  
                  {/* Continue for warranty repairs awaiting */}
                  {isAwaitingRepair && linkedIssue && (
                    <Button 
                      onClick={async () => {
                        try {
                          await axios.put(`${API}/issues/${linkedIssue.id}`, {
                            start_repair: true,
                            repair_id: linkedIssue.current_repair_id
                          });
                          
                          if (selectedTask.id) {
                            await axios.put(`${API}/scheduled-maintenance/${selectedTask.id}`, {
                              status: "in_progress"
                            });
                          }
                          
                          toast.success("Started repair - visible in Services");
                          setTaskDetailOpen(false);
                          fetchData();
                        } catch (error) {
                          toast.error("Failed to start repair");
                        }
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6"
                      data-testid="popup-continue-btn"
                    >
                      <Play size={18} className="mr-2" />
                      Continue
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
          
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setTaskDetailOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TechnicianCalendar;
