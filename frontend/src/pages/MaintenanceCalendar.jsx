import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
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
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isBefore, parseISO } from "date-fns";

const MaintenanceCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [upcomingCount, setUpcomingCount] = useState({ upcoming: 0, overdue: 0 });
  const [cityFilter, setCityFilter] = useState("all");
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
      
      const [maintenanceRes, productsRes, countRes] = await Promise.all([
        axios.get(`${API}/scheduled-maintenance?year=${year}&month=${month}`),
        axios.get(`${API}/products`),
        axios.get(`${API}/scheduled-maintenance/upcoming/count`),
      ]);
      
      setMaintenanceItems(maintenanceRes.data);
      setProducts(productsRes.data);
      setUpcomingCount(countRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
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

  const filteredMaintenance = cityFilter === "all"
    ? maintenanceItems
    : maintenanceItems.filter((item) => getProductCity(item.product_id) === cityFilter);

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
    if (item.source === "auto_yearly" || item.maintenance_type === "routine") return "border-emerald-500";
    if (item.priority === "12h") return "border-orange-500";
    if (item.priority === "24h") return "border-red-500";
    return "border-blue-500";
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
            Maintenance Calendar
          </h1>
          <p className="text-slate-500 mt-1">Schedule and track maintenance for all units</p>
        </div>
        <Button
          onClick={() => openNewMaintenanceDialog()}
          className="bg-[#0066CC] hover:bg-[#0052A3]"
          data-testid="schedule-maintenance-btn"
        >
          <Plus size={18} className="mr-2" />
          Schedule Maintenance
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card data-testid="stat-upcoming">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Upcoming (30 days)</p>
                <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {upcomingCount.upcoming}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#0066CC] rounded-xl flex items-center justify-center">
                <Clock className="text-white" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="stat-overdue">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Overdue</p>
                <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {upcomingCount.overdue}
                </p>
              </div>
              <div className={`w-12 h-12 ${upcomingCount.overdue > 0 ? 'bg-red-500' : 'bg-slate-400'} rounded-xl flex items-center justify-center`}>
                <AlertTriangle className="text-white" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="stat-this-month">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">This Month</p>
                <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {filteredMaintenance.filter(m => m.status === "scheduled").length}
                </p>
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
            <p className="text-sm font-medium text-slate-500 mb-2">Filter by City</p>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger data-testid="calendar-city-filter">
                <Building2 size={16} className="mr-2" />
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

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
              {filteredMaintenance.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-l-4 bg-white border ${getTaskBorderColor(item)}`}
                  data-testid={`list-item-${item.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-12 rounded-full ${
                      item.status === "completed" ? "bg-slate-800" :
                      item.status === "in_progress" ? "bg-blue-500" :
                      item.source === "auto_yearly" || item.maintenance_type === "routine" ? "bg-emerald-500" :
                      item.priority === "12h" ? "bg-orange-500" :
                      item.priority === "24h" ? "bg-red-500" : "bg-blue-500"
                    }`} />
                    <div>
                      <p className="font-medium text-slate-900">
                        S/N: {getProductSerial(item.product_id)}
                      </p>
                      <p className="text-sm text-slate-600 capitalize">
                        {item.maintenance_type.replace("_", " ")} • {format(parseISO(item.scheduled_date), "MMM d, yyyy HH:mm")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Building2 size={10} className="mr-1" />
                          {getProductCity(item.product_id)}
                        </Badge>
                        {item.priority && (
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
              <Input
                id="technician_name"
                value={formData.technician_name}
                onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
                placeholder="Enter technician name"
                data-testid="schedule-input-technician"
                className="mt-1"
              />
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
    </div>
  );
};

export default MaintenanceCalendar;
