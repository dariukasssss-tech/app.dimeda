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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Wrench, CalendarIcon, User, FileText, Trash2, AlertTriangle, Clock, CheckCircle, Timer, Shield, ShieldOff, FileCheck, ArrowRight, MapPin } from "lucide-react";
import { format } from "date-fns";

// Beta version technician list
const TECHNICIANS = ["Technician 1", "Technician 2", "Technician 3"];

const Services = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [inProgressIssues, setInProgressIssues] = useState([]);
  const [inServiceIssues, setInServiceIssues] = useState([]); // Warranty issues waiting for service
  const [warrantyServiceIssues, setWarrantyServiceIssues] = useState([]); // Make Service routed issues
  const [resolvedWarrantyIssues, setResolvedWarrantyIssues] = useState([]); // Resolved warranty issues
  const [resolvedNonWarrantyIssues, setResolvedNonWarrantyIssues] = useState([]); // Resolved non-warranty issues
  const [nonWarrantyIssues, setNonWarrantyIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("issues");
  const [serviceMode, setServiceMode] = useState("new"); // "new" or "from_issue"
  const [selectedNonWarrantyIssue, setSelectedNonWarrantyIssue] = useState("");
  // Track popup state
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [trackData, setTrackData] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    technician_name: "",
    service_type: "",
    description: "",
    issues_found: "",
    warranty_status: "",
  });
  
  // Resolve form data
  const [resolveData, setResolveData] = useState({
    warranty_service_type: "",
    resolution: "",
    estimated_fix_time: "",
    estimated_cost: "",
    create_service_record: true, // OPTIMIZATION 3: Default to auto-create service record
  });

  // Warranty options
  const WARRANTY_OPTIONS = ["Warranty", "Non Warranty"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, productsRes, allIssuesRes] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/products`),
        axios.get(`${API}/issues`),
      ]);
      setServices(servicesRes.data);
      setProducts(productsRes.data);
      
      const allIssues = allIssuesRes.data;
      
      // In progress issues (not warranty routes)
      setInProgressIssues(allIssues.filter(
        issue => issue.status === "in_progress" && !issue.is_warranty_route
      ));
      
      // In service issues (waiting for warranty service to complete)
      setInServiceIssues(allIssues.filter(
        issue => issue.status === "in_service"
      ));
      
      // Warranty service routed issues (Make Service)
      setWarrantyServiceIssues(allIssues.filter(
        issue => issue.is_warranty_route && issue.status !== "resolved"
      ));
      
      // Resolved warranty issues
      setResolvedWarrantyIssues(allIssues.filter(
        issue => issue.warranty_service_type === "warranty" && issue.status === "resolved" && !issue.is_warranty_route
      ));
      
      // Resolved non-warranty issues
      setResolvedNonWarrantyIssues(allIssues.filter(
        issue => issue.warranty_service_type === "non_warranty" && issue.status === "resolved"
      ));
      
      // Filter for non-warranty resolved issues that haven't been converted to service yet
      const nonWarranty = allIssues.filter(
        issue => issue.warranty_service_type === "non_warranty" && issue.status === "resolved"
      );
      setNonWarrantyIssues(nonWarranty);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // State for technician assignment in track dialog
  const [trackTechnicianAssigning, setTrackTechnicianAssigning] = useState(false);
  const [selectedTrackTechnician, setSelectedTrackTechnician] = useState("");
  
  // Fetch issue track data
  const fetchIssueTrack = async (issueId) => {
    setTrackLoading(true);
    try {
      const response = await axios.get(`${API}/issues/${issueId}/track`);
      setTrackData(response.data);
      // Pre-select current technician if assigned
      if (response.data.warranty_service_issue?.technician_name) {
        setSelectedTrackTechnician(response.data.warranty_service_issue.technician_name);
      } else {
        setSelectedTrackTechnician("");
      }
      setTrackDialogOpen(true);
    } catch (error) {
      toast.error("Failed to fetch issue track");
    } finally {
      setTrackLoading(false);
    }
  };
  
  // Handle technician assignment from track dialog
  const handleTrackTechnicianAssign = async () => {
    if (!trackData?.warranty_service_issue?.id || !selectedTrackTechnician) return;
    
    setTrackTechnicianAssigning(true);
    try {
      await axios.put(`${API}/issues/${trackData.warranty_service_issue.id}`, {
        technician_name: selectedTrackTechnician,
        status: "in_progress" // Also update status to in_progress when technician is assigned
      });
      toast.success(`Technician ${selectedTrackTechnician} assigned successfully`);
      
      // Refresh track data and main list
      await fetchIssueTrack(trackData.original_issue?.id || trackData.current_issue?.id);
      fetchData();
    } catch (error) {
      toast.error("Failed to assign technician");
    } finally {
      setTrackTechnicianAssigning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/services`, {
        ...formData,
        service_date: selectedDate.toISOString(),
      });
      toast.success("Service record created successfully");
      resetDialogState();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create service record");
    }
  };

  // State for "from issue" mode form
  const [fromIssueData, setFromIssueData] = useState({
    technician_name: "",
    scheduled_date: new Date(),
  });

  const handleCreateFromIssue = async () => {
    if (!selectedNonWarrantyIssue || !fromIssueData.technician_name) return;
    
    const issue = nonWarrantyIssues.find(i => i.id === selectedNonWarrantyIssue);
    if (!issue) return;

    try {
      await axios.post(`${API}/services`, {
        product_id: issue.product_id,
        technician_name: fromIssueData.technician_name,
        service_type: "repair",
        description: `${issue.title}\n\nResolution: ${issue.resolution || "N/A"}\n\nEstimated Fix Time: ${issue.estimated_fix_time ? issue.estimated_fix_time + " hours" : "N/A"}\nEstimated Cost: ${issue.estimated_cost ? issue.estimated_cost + " Eur" : "N/A"}`,
        issues_found: issue.description,
        warranty_status: "non_warranty",
        service_date: fromIssueData.scheduled_date.toISOString(),
        linked_issue_id: issue.id,
      });
      toast.success("Service record created from issue");
      resetDialogState();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create service record");
    }
  };

  const resetDialogState = () => {
    setDialogOpen(false);
    setServiceMode("new");
    setSelectedNonWarrantyIssue("");
    setFromIssueData({
      technician_name: "",
      scheduled_date: new Date(),
    });
    setFormData({
      product_id: "",
      technician_name: "",
      service_type: "",
      description: "",
      issues_found: "",
      warranty_status: "",
    });
    setSelectedDate(new Date());
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service record?")) return;
    try {
      await axios.delete(`${API}/services/${id}`);
      toast.success("Service record deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete service record");
    }
  };

  const openResolveDialog = (issue) => {
    setSelectedIssue(issue);
    setResolveData({
      warranty_service_type: "",
      resolution: "",
      estimated_fix_time: "",
      estimated_cost: "",
      create_service_record: true, // Default checked for non-warranty
    });
    setResolveDialogOpen(true);
  };

  const handleResolveIssue = async () => {
    if (!selectedIssue) return;
    try {
      await axios.put(`${API}/issues/${selectedIssue.id}`, {
        status: "resolved",
        resolution: resolveData.resolution,
        warranty_service_type: resolveData.warranty_service_type,
        estimated_fix_time: resolveData.warranty_service_type === "non_warranty" ? resolveData.estimated_fix_time : null,
        estimated_cost: resolveData.warranty_service_type === "non_warranty" ? resolveData.estimated_cost : null,
        // OPTIMIZATION 3: Auto-create service record for non-warranty
        create_service_record: resolveData.warranty_service_type === "non_warranty" ? resolveData.create_service_record : false,
      });
      const successMsg = resolveData.warranty_service_type === "non_warranty" && resolveData.create_service_record 
        ? "Issue resolved & service record created" 
        : "Issue resolved successfully";
      toast.success(successMsg);
      setResolveDialogOpen(false);
      setSelectedIssue(null);
      setResolveData({
        warranty_service_type: "",
        resolution: "",
        estimated_fix_time: "",
        estimated_cost: "",
        create_service_record: true,
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to resolve issue");
    }
  };

  const getProductSerial = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const getProductCity = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.city || "Unknown";
  };

  // Calculate SLA time remaining for customer issues (only for warranty)
  const calculateSLARemaining = (issue) => {
    // Non-warranty issues have no SLA limit
    if (issue.warranty_service_type === "non_warranty") return null;
    if (issue.source !== "customer" || issue.status === "resolved") return null;
    
    const createdAt = new Date(issue.created_at);
    const slaDeadline = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = slaDeadline - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: t("time.slaExpired"), urgent: true };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { expired: false, text: t("time.hoursLeft", { hours, minutes }), urgent: hours < 2 };
    }
    return { expired: false, text: t("time.minutesLeft", { minutes }), urgent: true };
  };

  const serviceTypeColors = {
    maintenance: "bg-blue-100 text-blue-800",
    repair: "bg-amber-100 text-amber-800",
    inspection: "bg-emerald-100 text-emerald-800",
  };

  const severityColors = {
    low: "bg-slate-100 text-slate-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="services-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t("services.title")} & {t("issues.title")}
          </h1>
          <p className="text-slate-500 mt-1">{t("services.manageIssues") || "Manage in-progress issues and service records"}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialogState(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]" data-testid="add-service-btn">
              <Plus size={18} className="mr-2" />
              Log Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="service-dialog">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Add Service Record</DialogTitle>
            </DialogHeader>
            
            {/* Service Mode Selection */}
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                variant={serviceMode === "new" ? "default" : "outline"}
                className={serviceMode === "new" ? "bg-[#0066CC] hover:bg-[#0052A3] flex-1" : "flex-1"}
                onClick={() => setServiceMode("new")}
                data-testid="mode-new-service"
              >
                <Plus size={16} className="mr-2" />
                Log New Service
              </Button>
              <Button
                type="button"
                variant={serviceMode === "from_issue" ? "default" : "outline"}
                className={serviceMode === "from_issue" ? "bg-[#0066CC] hover:bg-[#0052A3] flex-1" : "flex-1"}
                onClick={() => setServiceMode("from_issue")}
                data-testid="mode-from-issue"
              >
                <FileCheck size={16} className="mr-2" />
                Choose Service
              </Button>
            </div>

            {/* From Issue Mode */}
            {serviceMode === "from_issue" && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Select Non-Warranty Issue *</Label>
                  <Select
                    value={selectedNonWarrantyIssue}
                    onValueChange={setSelectedNonWarrantyIssue}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-non-warranty-issue">
                      <SelectValue placeholder="Select a resolved non-warranty issue" />
                    </SelectTrigger>
                    <SelectContent>
                      {nonWarrantyIssues.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500 text-center">
                          No non-warranty issues available
                        </div>
                      ) : (
                        nonWarrantyIssues.map((issue) => (
                          <SelectItem key={issue.id} value={issue.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{issue.title}</span>
                              <span className="text-xs text-slate-500">
                                S/N: {getProductSerial(issue.product_id)} • {issue.technician_name || "No technician"}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview selected issue */}
                {selectedNonWarrantyIssue && (() => {
                  const issue = nonWarrantyIssues.find(i => i.id === selectedNonWarrantyIssue);
                  if (!issue) return null;
                  return (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-medium text-slate-900 mb-2">{issue.title}</h4>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p><strong>Product:</strong> S/N: {getProductSerial(issue.product_id)}</p>
                        {issue.estimated_fix_time && <p><strong>Est. Fix Time:</strong> {issue.estimated_fix_time} hours</p>}
                        {issue.estimated_cost && <p><strong>Est. Cost:</strong> {issue.estimated_cost} Eur</p>}
                        {issue.resolution && <p><strong>Resolution:</strong> {issue.resolution}</p>}
                      </div>
                      <Badge className="mt-2 bg-gray-100 text-gray-800">
                        <ShieldOff size={12} className="mr-1" /> Non-Warranty
                      </Badge>
                    </div>
                  );
                })()}

                {/* Technician Selection */}
                <div>
                  <Label>Assign Technician *</Label>
                  <Select
                    value={fromIssueData.technician_name}
                    onValueChange={(value) => setFromIssueData({ ...fromIssueData, technician_name: value })}
                  >
                    <SelectTrigger className="mt-1" data-testid="from-issue-technician">
                      <SelectValue placeholder="Select technician" />
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

                {/* Scheduled Date */}
                <div>
                  <Label>Scheduled Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full mt-1 justify-start text-left font-normal"
                        data-testid="from-issue-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(fromIssueData.scheduled_date, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={fromIssueData.scheduled_date}
                        onSelect={(date) => date && setFromIssueData({ ...fromIssueData, scheduled_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateFromIssue}
                    className="bg-[#0066CC] hover:bg-[#0052A3]"
                    disabled={!selectedNonWarrantyIssue || !fromIssueData.technician_name}
                    data-testid="create-from-issue-btn"
                  >
                    Create Service Record
                  </Button>
                </div>
              </div>
            )}

            {/* New Service Mode - Original Form */}
            {serviceMode === "new" && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Product *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-product">
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
                <Label>Service Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1 justify-start text-left font-normal"
                      data-testid="select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="technician_name">Technician Name *</Label>
                <Select
                  value={formData.technician_name}
                  onValueChange={(value) => setFormData({ ...formData, technician_name: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-technician">
                    <SelectValue placeholder="Select technician" />
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
                <Label>Service Type *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-service-type">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Warranty Status *</Label>
                <Select
                  value={formData.warranty_status}
                  onValueChange={(value) => setFormData({ ...formData, warranty_status: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-warranty">
                    <SelectValue placeholder="Select warranty status" />
                  </SelectTrigger>
                  <SelectContent>
                    {WARRANTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt.toLowerCase().replace(' ', '_')}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the service performed..."
                  required
                  data-testid="input-description"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="issues_found">Issues Found (Optional)</Label>
                <Textarea
                  id="issues_found"
                  value={formData.issues_found}
                  onChange={(e) => setFormData({ ...formData, issues_found: e.target.value })}
                  placeholder="Note any issues discovered during service..."
                  data-testid="input-issues-found"
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
                  disabled={!formData.product_id || !formData.technician_name || !formData.service_type || !formData.description}
                  data-testid="submit-service-btn"
                >
                  Save Record
                </Button>
              </div>
            </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for Issues and Service Records */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <Clock size={16} />
            In Progress ({inProgressIssues.length})
          </TabsTrigger>
          <TabsTrigger value="in_service" className="flex items-center gap-2">
            <Shield size={16} />
            In Service ({inServiceIssues.length + warrantyServiceIssues.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <CheckCircle size={16} />
            Resolved ({resolvedWarrantyIssues.length + resolvedNonWarrantyIssues.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Wrench size={16} />
            Records ({services.length})
          </TabsTrigger>
        </TabsList>

        {/* In Progress Issues Tab */}
        <TabsContent value="issues" className="mt-6">
          <div className="space-y-4" data-testid="in-progress-issues-list">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">Loading...</CardContent>
              </Card>
            ) : inProgressIssues.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="mx-auto text-slate-300" size={48} />
                  <p className="text-slate-500 mt-4">No issues in progress</p>
                  <p className="text-sm text-slate-400 mt-1">Issues marked as "In Progress" will appear here</p>
                </CardContent>
              </Card>
            ) : (
              inProgressIssues.map((issue) => (
                <Card 
                  key={issue.id} 
                  className={`card-hover ${issue.source === "customer" ? "bg-slate-50 border-slate-300" : ""}`}
                  data-testid={`issue-card-${issue.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Customer badge */}
                          {issue.source === "customer" && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Customer Reported
                            </Badge>
                          )}
                          <Badge className="bg-blue-100 text-blue-800">
                            <Clock size={12} className="mr-1" />
                            In Progress
                          </Badge>
                          <Badge className={severityColors[issue.severity] || "bg-slate-100"}>
                            {issue.severity}
                          </Badge>
                          <Badge variant="outline">{issue.issue_type}</Badge>
                          
                          {/* Warranty/Non-Warranty Status */}
                          {issue.warranty_service_type ? (
                            <Badge className={issue.warranty_service_type === "warranty" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                            }>
                              {issue.warranty_service_type === "warranty" ? (
                                <><Shield size={12} className="mr-1" /> Warranty</>
                              ) : (
                                <><ShieldOff size={12} className="mr-1" /> Non-Warranty</>
                              )}
                            </Badge>
                          ) : issue.warranty_status && (
                            <Badge className={issue.warranty_status === "warranty" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                            }>
                              {issue.warranty_status === "warranty" ? "Warranty" : "Non-Warranty"}
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-semibold text-slate-900 mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {issue.title}
                        </h3>
                        
                        <div className="text-sm text-slate-500 mt-1">
                          <span>S/N: {getProductSerial(issue.product_id)}</span>
                          <span className="mx-2">•</span>
                          <span>Place: {getProductCity(issue.product_id)}</span>
                        </div>
                        
                        {issue.product_location && (
                          <p className="text-sm text-slate-500 mt-1">
                            <span className="font-medium">Location:</span> {issue.product_location}
                          </p>
                        )}
                        
                        {/* Technician and SLA info */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {issue.technician_name && (
                            <span className="text-sm text-slate-600 flex items-center gap-1">
                              <User size={14} />
                              {issue.technician_name}
                            </span>
                          )}
                          
                          {/* SLA Timer - only for warranty issues */}
                          {issue.source === "customer" && issue.warranty_service_type !== "non_warranty" && (() => {
                            const sla = calculateSLARemaining(issue);
                            if (!sla) return null;
                            return (
                              <Badge className={`${sla.expired ? "bg-red-500 text-white" : sla.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                                <Timer size={12} className="mr-1" />
                                {sla.text}
                              </Badge>
                            );
                          })()}
                          
                          {/* No SLA for non-warranty */}
                          {issue.warranty_service_type === "non_warranty" && (
                            <Badge variant="outline" className="text-slate-500">
                              No time limit
                            </Badge>
                          )}
                        </div>
                        
                        {/* Non-warranty details */}
                        {issue.warranty_service_type === "non_warranty" && (issue.estimated_fix_time || issue.estimated_cost) && (
                          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-2">Non-Warranty Service Details:</p>
                            <div className="flex gap-4 text-sm">
                              {issue.estimated_fix_time && (
                                <span><strong>Est. Fix Time:</strong> {issue.estimated_fix_time}</span>
                              )}
                              {issue.estimated_cost && (
                                <span><strong>Est. Cost:</strong> {issue.estimated_cost}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <p className="text-slate-600 mt-3 whitespace-pre-line">{issue.description}</p>
                        
                        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                          <span>Registered: {new Date(issue.created_at).toLocaleString()}</span>
                          {issue.technician_assigned_at && (
                            <span>Assigned: {new Date(issue.technician_assigned_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Resolve Button */}
                      <Button
                        onClick={() => openResolveDialog(issue)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        data-testid={`resolve-issue-${issue.id}`}
                      >
                        <CheckCircle size={16} className="mr-2" />
                        Resolve Issue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Service Records Tab */}
        <TabsContent value="services" className="mt-6">
          <div className="space-y-4" data-testid="services-list">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">Loading...</CardContent>
              </Card>
            ) : services.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wrench className="mx-auto text-slate-300" size={48} />
                  <p className="text-slate-500 mt-4">No service records yet</p>
                  <p className="text-sm text-slate-400 mt-1">Log your first service to get started</p>
                </CardContent>
              </Card>
            ) : (
              services.map((service) => (
                <Card key={service.id} className="card-hover" data-testid={`service-card-${service.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${serviceTypeColors[service.service_type] || 'bg-slate-100 text-slate-800'}`}>
                            {service.service_type}
                          </span>
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <CalendarIcon size={14} />
                            {new Date(service.service_date).toLocaleDateString()}
                          </span>
                          {/* Warranty Status Badge */}
                          {service.warranty_status && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              service.warranty_status === "warranty" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {service.warranty_status === "warranty" ? "Warranty" : "Non Warranty"}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          S/N: {getProductSerial(service.product_id)}
                        </h3>
                        <p className="text-slate-600 mt-2">{service.description}</p>
                        {service.issues_found && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800">
                              <strong>Issues Found:</strong> {service.issues_found}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {service.technician_name}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(service.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-service-${service.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* In Service Tab - Warranty issues waiting for service */}
        <TabsContent value="in_service" className="mt-6">
          <div className="space-y-6" data-testid="in-service-issues-list">
            {/* Original issues marked as In Service */}
            {inServiceIssues.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Shield className="text-amber-500" size={20} />
                  Awaiting Warranty Service ({inServiceIssues.length})
                </h3>
                <div className="space-y-4">
                  {inServiceIssues.map((issue) => {
                    // Find the linked warranty service issue
                    const linkedServiceIssue = warrantyServiceIssues.find(wi => wi.parent_issue_id === issue.id);
                    return (
                    <Card 
                      key={issue.id} 
                      className="border-l-4 border-amber-500"
                      data-testid={`in-service-${issue.id}`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {issue.issue_code && (
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                                  {issue.issue_code}
                                </span>
                              )}
                              <Badge className="bg-amber-100 text-amber-800">
                                <Clock size={12} className="mr-1" />
                                In Service
                              </Badge>
                              <Badge className="bg-green-100 text-green-800">
                                <Shield size={12} className="mr-1" />
                                Warranty
                              </Badge>
                              {linkedServiceIssue && (
                                <Badge variant="outline" className="text-purple-700 border-purple-300">
                                  Service: {linkedServiceIssue.issue_code}
                                </Badge>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mt-2">{issue.title}</h3>
                            <div className="text-sm text-slate-500 mt-1">
                              <span>S/N: {getProductSerial(issue.product_id)}</span>
                              <span className="mx-2">•</span>
                              <span>{getProductCity(issue.product_id)}</span>
                            </div>
                            {issue.resolution && (
                              <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                                <strong>Resolution:</strong> {issue.resolution}
                              </p>
                            )}
                            {linkedServiceIssue?.technician_name && (
                              <p className="text-sm text-purple-700 mt-2 flex items-center gap-1">
                                <User size={14} />
                                Assigned to: {linkedServiceIssue.technician_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (linkedServiceIssue) {
                                  setSelectedIssue(linkedServiceIssue);
                                  setResolveDialogOpen(true);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              disabled={!linkedServiceIssue}
                            >
                              <CheckCircle size={14} className="mr-1" />
                              Complete Service
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchIssueTrack(issue.id);
                              }}
                            >
                              <FileText size={14} className="mr-1" />
                              View Track
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="mx-auto text-slate-300" size={48} />
                  <p className="text-slate-500 mt-4">No issues in service</p>
                  <p className="text-sm text-slate-400 mt-1">Warranty service issues will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Resolved Issues Tab - Grouped by Warranty/Non-Warranty */}
        <TabsContent value="resolved" className="mt-6">
          <div className="space-y-6" data-testid="resolved-issues-list">
            {/* Resolved Warranty Issues */}
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Shield className="text-green-500" size={20} />
                Warranty Services ({resolvedWarrantyIssues.length})
              </h3>
              {resolvedWarrantyIssues.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-slate-500">
                    No resolved warranty issues
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {resolvedWarrantyIssues.map((issue) => (
                    <Card 
                      key={issue.id} 
                      className="border-l-4 border-green-500 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => fetchIssueTrack(issue.id)}
                      data-testid={`resolved-warranty-${issue.id}`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {issue.issue_code && (
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                                  {issue.issue_code}
                                </span>
                              )}
                              <Badge className="bg-emerald-100 text-emerald-800">
                                <CheckCircle size={12} className="mr-1" />
                                Resolved
                              </Badge>
                              <Badge className="bg-green-100 text-green-800">
                                <Shield size={12} className="mr-1" />
                                Warranty
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mt-2">{issue.title}</h3>
                            <div className="text-sm text-slate-500 mt-1">
                              <span>S/N: {getProductSerial(issue.product_id)}</span>
                              <span className="mx-2">•</span>
                              <span>{getProductCity(issue.product_id)}</span>
                            </div>
                            {issue.resolution && (
                              <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded line-clamp-2">
                                <strong>Resolution:</strong> {issue.resolution}
                              </p>
                            )}
                            {issue.resolved_at && (
                              <p className="text-xs text-slate-400 mt-2">
                                Resolved: {new Date(issue.resolved_at).toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-blue-600 mt-1">Click to view full track</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Resolved Non-Warranty Issues */}
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <ShieldOff className="text-gray-500" size={20} />
                Non-Warranty Services ({resolvedNonWarrantyIssues.length})
              </h3>
              {resolvedNonWarrantyIssues.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-slate-500">
                    No resolved non-warranty issues
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {resolvedNonWarrantyIssues.map((issue) => (
                    <Card 
                      key={issue.id} 
                      className="border-l-4 border-gray-400"
                      data-testid={`resolved-non-warranty-${issue.id}`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {issue.issue_code && (
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                                  {issue.issue_code}
                                </span>
                              )}
                              <Badge className="bg-emerald-100 text-emerald-800">
                                <CheckCircle size={12} className="mr-1" />
                                Resolved
                              </Badge>
                              <Badge className="bg-gray-100 text-gray-800">
                                <ShieldOff size={12} className="mr-1" />
                                Non-Warranty
                              </Badge>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mt-2">{issue.title}</h3>
                            <div className="text-sm text-slate-500 mt-1">
                              <span>S/N: {getProductSerial(issue.product_id)}</span>
                              <span className="mx-2">•</span>
                              <span>{getProductCity(issue.product_id)}</span>
                            </div>
                            {issue.resolution && (
                              <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded line-clamp-2">
                                <strong>Resolution:</strong> {issue.resolution}
                              </p>
                            )}
                            {(issue.estimated_fix_time || issue.estimated_cost) && (
                              <div className="flex gap-4 text-sm text-slate-600 mt-2">
                                {issue.estimated_fix_time && <span>Time: {issue.estimated_fix_time}h</span>}
                                {issue.estimated_cost && <span>Cost: {issue.estimated_cost} Eur</span>}
                              </div>
                            )}
                            {issue.resolved_at && (
                              <p className="text-xs text-slate-400 mt-2">
                                Resolved: {new Date(issue.resolved_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Issue Track Dialog */}
      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="track-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <FileText size={20} className="text-blue-600" />
              Issue Track
            </DialogTitle>
          </DialogHeader>
          
          {trackLoading ? (
            <div className="py-8 text-center text-slate-500">Loading track...</div>
          ) : trackData ? (
            <div className="space-y-4 mt-4">
              {/* Product Info */}
              {trackData.product && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Product Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Serial Number:</span>
                      <p className="font-medium">{trackData.product.serial_number}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">City:</span>
                      <p className="font-medium">{trackData.product.city}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Model:</span>
                      <p className="font-medium">{trackData.product.model_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="font-medium">{trackData.product.location_detail || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Original Issue */}
              {trackData.original_issue && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Original Issue
                  </h4>
                  <div className="space-y-2 text-sm">
                    {trackData.original_issue.issue_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-blue-700">Code:</span>
                        <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-800 font-mono">
                          {trackData.original_issue.issue_code}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-blue-700">Title:</span>
                      <p className="font-medium text-blue-900">{trackData.original_issue.title}</p>
                    </div>
                    <div>
                      <span className="text-blue-700">Description:</span>
                      <p className="text-blue-800">{trackData.original_issue.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-blue-700">Type:</span>
                        <p className="font-medium capitalize">{trackData.original_issue.issue_type}</p>
                      </div>
                      <div>
                        <span className="text-blue-700">Status:</span>
                        <Badge className={
                          trackData.original_issue.status === "resolved" ? "bg-emerald-500 text-white" :
                          trackData.original_issue.status === "in_service" ? "bg-amber-500 text-white" :
                          "bg-blue-500 text-white"
                        }>
                          {trackData.original_issue.status}
                        </Badge>
                      </div>
                    </div>
                    {trackData.original_issue.resolution && (
                      <div>
                        <span className="text-blue-700">Resolution:</span>
                        <p className="text-blue-800 bg-blue-100 p-2 rounded mt-1">{trackData.original_issue.resolution}</p>
                      </div>
                    )}
                    <div className="flex gap-4 text-xs text-blue-600 pt-2">
                      <span>Created: {new Date(trackData.original_issue.created_at).toLocaleString()}</span>
                      {trackData.original_issue.resolved_at && (
                        <span>Resolved: {new Date(trackData.original_issue.resolved_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Arrow indicator for warranty flow */}
              {trackData.is_warranty_flow && trackData.warranty_service_issue && (
                <div className="flex justify-center">
                  <ArrowRight size={24} className="text-purple-500" />
                </div>
              )}

              {/* Warranty Service Issue */}
              {trackData.warranty_service_issue && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Wrench size={16} />
                    Warranty Service Issue (Routed)
                  </h4>
                  <div className="space-y-2 text-sm">
                    {trackData.warranty_service_issue.issue_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-purple-700">Code:</span>
                        <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-800 font-mono">
                          {trackData.warranty_service_issue.issue_code}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-purple-700">Title:</span>
                      <p className="font-medium text-purple-900">{trackData.warranty_service_issue.title}</p>
                    </div>
                    <div>
                      <span className="text-purple-700">Description:</span>
                      <p className="text-purple-800">{trackData.warranty_service_issue.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-purple-700">Status:</span>
                        <Badge className={
                          trackData.warranty_service_issue.status === "resolved" ? "bg-emerald-500 text-white" :
                          "bg-purple-500 text-white"
                        }>
                          {trackData.warranty_service_issue.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-purple-700">Technician:</span>
                        <p className="font-medium">{trackData.warranty_service_issue.technician_name || "Unassigned"}</p>
                      </div>
                    </div>
                    
                    {/* Technician Assignment Section - Only for non-resolved issues */}
                    {trackData.warranty_service_issue.status !== "resolved" && (
                      <div className="mt-4 p-3 bg-purple-100 rounded-lg border border-purple-300">
                        <Label className="text-purple-800 font-medium">Assign/Re-assign Technician</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Select
                            value={selectedTrackTechnician}
                            onValueChange={setSelectedTrackTechnician}
                          >
                            <SelectTrigger className="flex-1 bg-white" data-testid="track-technician-select">
                              <SelectValue placeholder="Select technician" />
                            </SelectTrigger>
                            <SelectContent>
                              {TECHNICIANS.map((tech) => (
                                <SelectItem key={tech} value={tech}>
                                  {tech}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={handleTrackTechnicianAssign}
                            disabled={!selectedTrackTechnician || trackTechnicianAssigning || selectedTrackTechnician === trackData.warranty_service_issue.technician_name}
                            className="bg-purple-600 hover:bg-purple-700"
                            data-testid="assign-technician-btn"
                          >
                            {trackTechnicianAssigning ? "Assigning..." : "Assign"}
                          </Button>
                        </div>
                        <p className="text-xs text-purple-600 mt-2">
                          Assigning a technician will add this task to their calendar and service list.
                        </p>
                      </div>
                    )}
                    {trackData.warranty_service_issue.resolution && (
                      <div>
                        <span className="text-purple-700">Service Resolution:</span>
                        <p className="text-purple-800 bg-purple-100 p-2 rounded mt-1">{trackData.warranty_service_issue.resolution}</p>
                      </div>
                    )}
                    <div className="flex gap-4 text-xs text-purple-600 pt-2">
                      <span>Created: {new Date(trackData.warranty_service_issue.created_at).toLocaleString()}</span>
                      {trackData.warranty_service_issue.resolved_at && (
                        <span>Resolved: {new Date(trackData.warranty_service_issue.resolved_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Current Issue (if viewing from child) */}
              {!trackData.original_issue && trackData.current_issue && !trackData.current_issue.is_warranty_route && (
                <div className="p-4 bg-slate-50 rounded-lg border">
                  <h4 className="font-semibold text-slate-900 mb-2">Issue Details</h4>
                  <div className="space-y-2 text-sm">
                    {trackData.current_issue.issue_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Code:</span>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                          {trackData.current_issue.issue_code}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-600">Title:</span>
                      <p className="font-medium">{trackData.current_issue.title}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Description:</span>
                      <p>{trackData.current_issue.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-600">Status:</span>
                        <Badge className={
                          trackData.current_issue.status === "resolved" ? "bg-emerald-500 text-white" :
                          trackData.current_issue.status === "in_service" ? "bg-amber-500 text-white" :
                          "bg-blue-500 text-white"
                        }>
                          {trackData.current_issue.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-slate-600">Service Type:</span>
                        <Badge className={trackData.current_issue.warranty_service_type === "warranty" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {trackData.current_issue.warranty_service_type || "N/A"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">No track data available</div>
          )}
          
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setTrackDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Issue Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="resolve-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Resolve Issue</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4 mt-4">
              {/* Issue Summary */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900">{selectedIssue.title}</p>
                <p className="text-sm text-slate-500">S/N: {getProductSerial(selectedIssue.product_id)}</p>
              </div>
              
              {/* Warranty Service Type - Required before Resolution Note */}
              <div>
                <Label>Service Type *</Label>
                <Select
                  value={resolveData.warranty_service_type}
                  onValueChange={(value) => setResolveData({ ...resolveData, warranty_service_type: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="resolve-warranty-type">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warranty">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-green-600" />
                        Warranty Service
                      </div>
                    </SelectItem>
                    <SelectItem value="non_warranty">
                      <div className="flex items-center gap-2">
                        <ShieldOff size={14} className="text-gray-600" />
                        Non-Warranty Service
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Non-Warranty fields */}
              {resolveData.warranty_service_type === "non_warranty" && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Non-Warranty Service Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimated_fix_time">Estimated Fix Time (hours)</Label>
                      <Input
                        id="estimated_fix_time"
                        type="number"
                        value={resolveData.estimated_fix_time}
                        onChange={(e) => setResolveData({ ...resolveData, estimated_fix_time: e.target.value })}
                        placeholder="e.g., 2"
                        className="mt-1"
                        data-testid="resolve-fix-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimated_cost">Estimated Cost (Eur)</Label>
                      <Input
                        id="estimated_cost"
                        type="number"
                        value={resolveData.estimated_cost}
                        onChange={(e) => setResolveData({ ...resolveData, estimated_cost: e.target.value })}
                        placeholder="e.g., 150"
                        className="mt-1"
                        data-testid="resolve-cost"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Resolution Note */}
              <div>
                <Label htmlFor="resolution">Resolution Note *</Label>
                <Textarea
                  id="resolution"
                  value={resolveData.resolution}
                  onChange={(e) => setResolveData({ ...resolveData, resolution: e.target.value })}
                  placeholder="Describe how the issue was resolved..."
                  className="mt-1"
                  rows={4}
                  data-testid="resolve-note"
                />
              </div>
              
              {/* OPTIMIZATION 3: Auto-create service record checkbox for non-warranty */}
              {resolveData.warranty_service_type === "non_warranty" && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="create_service_record"
                    checked={resolveData.create_service_record}
                    onChange={(e) => setResolveData({ ...resolveData, create_service_record: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    data-testid="create-service-checkbox"
                  />
                  <label htmlFor="create_service_record" className="text-sm text-blue-800">
                    Automatically create Service Record from this issue
                  </label>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleResolveIssue}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!resolveData.warranty_service_type || !resolveData.resolution.trim()}
                  data-testid="confirm-resolve-btn"
                >
                  Resolve Issue
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
