import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
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
import { Plus, Wrench, CalendarIcon, User, FileText, Trash2, AlertTriangle, Clock, CheckCircle, Timer, Shield, ShieldOff, FileCheck } from "lucide-react";
import { format } from "date-fns";

// Beta version technician list
const TECHNICIANS = ["Technician 1", "Technician 2", "Technician 3"];

const Services = () => {
  const [services, setServices] = useState([]);
  const [inProgressIssues, setInProgressIssues] = useState([]);
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
  });

  // Warranty options
  const WARRANTY_OPTIONS = ["Warranty", "Non Warranty"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, productsRes, issuesInProgressRes, allIssuesRes] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/products`),
        axios.get(`${API}/issues?status=in_progress`),
        axios.get(`${API}/issues`),
      ]);
      setServices(servicesRes.data);
      setProducts(productsRes.data);
      setInProgressIssues(issuesInProgressRes.data);
      // Filter for non-warranty resolved issues that haven't been converted to service yet
      const nonWarranty = allIssuesRes.data.filter(
        issue => issue.warranty_service_type === "non_warranty" && issue.status === "resolved"
      );
      setNonWarrantyIssues(nonWarranty);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
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

  const handleCreateFromIssue = async () => {
    if (!selectedNonWarrantyIssue) return;
    
    const issue = nonWarrantyIssues.find(i => i.id === selectedNonWarrantyIssue);
    if (!issue) return;

    try {
      await axios.post(`${API}/services`, {
        product_id: issue.product_id,
        technician_name: issue.technician_name || TECHNICIANS[0],
        service_type: "repair",
        description: `${issue.title}\n\nResolution: ${issue.resolution || "N/A"}\n\nEstimated Fix Time: ${issue.estimated_fix_time || "N/A"}\nEstimated Cost: ${issue.estimated_cost || "N/A"}`,
        issues_found: issue.description,
        warranty_status: "non_warranty",
        service_date: new Date().toISOString(),
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
      });
      toast.success("Issue resolved successfully");
      setResolveDialogOpen(false);
      setSelectedIssue(null);
      setResolveData({
        warranty_service_type: "",
        resolution: "",
        estimated_fix_time: "",
        estimated_cost: "",
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
      return { expired: true, text: "SLA Expired" };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { expired: false, text: `${hours}h ${minutes}m left`, urgent: hours < 2 };
    }
    return { expired: false, text: `${minutes}m left`, urgent: true };
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
            Service & Issues
          </h1>
          <p className="text-slate-500 mt-1">Manage in-progress issues and service records</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]" data-testid="add-service-btn">
              <Plus size={18} className="mr-2" />
              Log Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="service-dialog">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Log Service Record</DialogTitle>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for Issues and Service Records */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <Clock size={16} />
            In Progress Issues ({inProgressIssues.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Wrench size={16} />
            Service Records ({services.length})
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
      </Tabs>

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
                      <Label htmlFor="estimated_fix_time">Estimated Fix Time</Label>
                      <Input
                        id="estimated_fix_time"
                        value={resolveData.estimated_fix_time}
                        onChange={(e) => setResolveData({ ...resolveData, estimated_fix_time: e.target.value })}
                        placeholder="e.g., 2 hours"
                        className="mt-1"
                        data-testid="resolve-fix-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimated_cost">Estimated Cost</Label>
                      <Input
                        id="estimated_cost"
                        value={resolveData.estimated_cost}
                        onChange={(e) => setResolveData({ ...resolveData, estimated_cost: e.target.value })}
                        placeholder="e.g., €150"
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
